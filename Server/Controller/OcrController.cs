using Microsoft.AspNetCore.Mvc;
using FinanceJarApp.Server.Services;
using System.Text.Json;

namespace FinanceJarApp.Server.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class OcrController : ControllerBase
    {
        private readonly GeminiService _geminiService;

        public OcrController(GeminiService geminiService)
        {
            _geminiService = geminiService;
        }

        [HttpPost("scan")]
        public async Task<IActionResult> ScanReceipt(IFormFile image)
        {
            if (image == null || image.Length == 0)
                return BadRequest("Vui lòng tải lên ảnh hóa đơn.");

            try
            {
                // Gọi Service để đọc ảnh
                using var stream = image.OpenReadStream();
                string jsonResult = await _geminiService.AnalyzeImageAsync(stream, image.ContentType);

                // Parse string thành object để trả về cho Frontend
                var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
                var resultObj = JsonSerializer.Deserialize<ReceiptResult>(jsonResult, options);

                return Ok(resultObj);
            }
            catch (Exception ex)
            {
                return StatusCode(500, "Lỗi phân tích hóa đơn: " + ex.Message);
            }
        }
    }

    // Class hứng dữ liệu trả về từ Gemini
    public class ReceiptResult
    {
        public string StoreName { get; set; }
        public decimal TotalAmount { get; set; }
        public string Date { get; set; }
        public List<string> Items { get; set; }
    }
}