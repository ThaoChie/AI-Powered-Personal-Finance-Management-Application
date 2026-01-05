using Microsoft.AspNetCore.Authorization; // 👈 Quan trọng: Để bảo vệ API
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using FinanceJarApp.Server.Data;
using FinanceJarApp.Server.Models;
using FinanceJarApp.Server.Services;
using System.Security.Claims; // 👈 Để lấy ID từ Token
using System.Text;
using UglyToad.PdfPig; // Thư viện đọc PDF
using UglyToad.PdfPig.Content;

namespace FinanceJarApp.Server.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize] // 🔒 BẮT BUỘC ĐĂNG NHẬP MỚI ĐƯỢC DÙNG
    public class ChatController : ControllerBase
    {
        private readonly GeminiService _geminiService;
        private readonly QdrantService _qdrantService;
        private readonly AppDbContext _context;

        public ChatController(GeminiService geminiService, QdrantService qdrantService, AppDbContext context)
        {
            _geminiService = geminiService;
            _qdrantService = qdrantService;
            _context = context;
        }

        // 👇 HELPER: Hàm lấy ID người dùng từ Token
        private int GetCurrentUserId()
        {
            var idClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(idClaim)) return 0;
            return int.Parse(idClaim);
        }

        // =======================================================
        // 1. API NẠP KIẾN THỨC (TEXT & PDF)
        // API: POST /api/Chat/upload-knowledge
        // =======================================================
        [HttpPost("upload-knowledge")]
        public async Task<IActionResult> UploadKnowledge(IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest("Vui lòng chọn file tài liệu.");

            try
            {
                string fileContent = "";

                // --- TRƯỜNG HỢP 1: FILE PDF ---
                if (file.FileName.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase))
                {
                    try 
                    {
                        using (var stream = file.OpenReadStream())
                        using (var pdf = PdfDocument.Open(stream))
                        {
                            var sb = new StringBuilder();
                            foreach (var page in pdf.GetPages())
                            {
                                sb.Append(page.Text);
                                sb.Append(" ");
                            }
                            fileContent = sb.ToString();
                        }
                    }
                    catch 
                    {
                        return BadRequest("Không đọc được file PDF này (có thể là ảnh scan).");
                    }
                }
                // --- TRƯỜNG HỢP 2: FILE TEXT ---
                else
                {
                    using (var reader = new StreamReader(file.OpenReadStream(), Encoding.UTF8))
                    {
                        fileContent = await reader.ReadToEndAsync();
                    }
                }

                if (string.IsNullOrWhiteSpace(fileContent))
                    return BadRequest("File không có nội dung chữ.");

                // Cắt ngắn nếu quá dài (Tránh lỗi Token Gemini)
                if (fileContent.Length > 30000)
                {
                    fileContent = fileContent.Substring(0, 30000) + "...";
                }

                // --- QUY TRÌNH HỌC (RAG) ---
                await _qdrantService.InitializeAsync();
                var vector = await _geminiService.GetEmbeddingAsync(fileContent);

                // Lưu vào Qdrant (Lưu ý: Hiện tại đang lưu chung bộ nhớ toàn cục)
                // Nếu muốn tách riêng từng user, cần sửa QdrantService để thêm filter payload userId
                string memoryContent = $"[Nguồn: {file.FileName}]\n{fileContent}";
                await _qdrantService.SaveMemoryAsync(memoryContent, vector);

                return Ok(new { message = $"✅ Đã học xong tài liệu: {file.FileName}" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Lỗi xử lý file: {ex.Message}");
            }
        }

        // =======================================================
        // 2. API DẠY HỌC BẰNG TEXT (Nhập tay)
        // API: POST /api/Chat/learn
        // =======================================================
        [HttpPost("learn")]
        public async Task<IActionResult> Learn([FromBody] ChatRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Message))
                return BadRequest("Nội dung không được để trống.");

            try
            {
                await _qdrantService.InitializeAsync();
                var vector = await _geminiService.GetEmbeddingAsync(request.Message);
                await _qdrantService.SaveMemoryAsync(request.Message, vector);

                return Ok(new { message = "✅ Đã nạp kiến thức!" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Lỗi: {ex.Message}");
            }
        }

        // =======================================================
        // 3. API CHAT (RAG + User Context)
        // API: POST /api/Chat/send
        // =======================================================
        [HttpPost("send")]
        public async Task<IActionResult> SendMessage([FromBody] ChatRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Message)) return BadRequest();

            // 👇 LẤY ĐÚNG USER ID TỪ TOKEN
            int userId = GetCurrentUserId();
            if (userId == 0) return Unauthorized();

            try
            {
                // B1: Tra cứu ký ức (RAG)
                await _qdrantService.InitializeAsync(); 
                var queryVector = await _geminiService.GetEmbeddingAsync(request.Message);
                var memories = await _qdrantService.SearchMemoryAsync(queryVector);

                // B2: Ghép ký ức vào Prompt
                string finalPrompt = request.Message;
                if (memories.Count > 0)
                {
                    string contextData = string.Join("\n- ", memories);
                    finalPrompt = $"[THÔNG TIN BỔ SUNG TỪ TÀI LIỆU]:\n{contextData}\n\n[CÂU HỎI]: {request.Message}\n\n(Ưu tiên dùng thông tin bổ sung để trả lời)";
                }

                // B3: Gửi cho Gemini (Kèm UserId để lưu lịch sử đúng người)
                var response = await _geminiService.GetChatResponseAsync(finalPrompt, userId);
                
                return Ok(new { reply = response });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Lỗi Server: {ex.Message}");
            }
        }

        // =======================================================
        // 4. LẤY LỊCH SỬ CHAT CỦA USER
        // API: GET /api/Chat/history
        // =======================================================
        [HttpGet("history")]
        public async Task<ActionResult> GetHistory()
        {
            int userId = GetCurrentUserId();
            if (userId == 0) return Unauthorized();

            var history = await _context.ChatMessages
                .Where(m => m.UserId == userId) // 👈 Chỉ lấy tin nhắn của user này
                .OrderBy(m => m.Timestamp)
                .Take(50)
                .ToListAsync();

            return Ok(history);
        }

        // =======================================================
        // 5. XÓA LỊCH SỬ CHAT CỦA USER
        // API: DELETE /api/Chat/clear
        // =======================================================
        [HttpDelete("clear")]
        public async Task<IActionResult> ClearHistory()
        {
            int userId = GetCurrentUserId();
            if (userId == 0) return Unauthorized();

            var messages = _context.ChatMessages.Where(m => m.UserId == userId);
            _context.ChatMessages.RemoveRange(messages);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Đã xóa lịch sử chat." });
        }
    }

    public class ChatRequest { public string Message { get; set; } }
}