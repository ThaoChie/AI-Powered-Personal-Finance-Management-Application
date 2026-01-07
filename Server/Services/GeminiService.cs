using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes; // Thêm thư viện này để parse JSON an toàn hơn
using FinanceJarApp.Server.Data;
using FinanceJarApp.Server.Models;
using Microsoft.EntityFrameworkCore;

namespace FinanceJarApp.Server.Services
{
    public class GeminiService
    {
        private readonly HttpClient _httpClient;
        private readonly string _apiKey;
        private readonly AppDbContext _context;

        // Cập nhật Constructor để dùng HttpClient Factory (Tốt hơn new HttpClient)
        public GeminiService(HttpClient httpClient, IConfiguration config, AppDbContext context)
        {
            _httpClient = httpClient;
            _context = context;

            var rawKey = config["GeminiKey"];
            if (string.IsNullOrWhiteSpace(rawKey))
            {
                // Thay vì throw lỗi làm sập app, ta gán rỗng và log cảnh báo
                Console.WriteLine("❌ LỖI: Chưa có 'GeminiKey' trong file appsettings.json!");
                _apiKey = "";
            }
            else 
            {
                _apiKey = rawKey.Replace(" ", "").Replace("\n", "").Replace("\r", "").Replace("\t", "").Trim();
            }
        }

        // --- 1. CHỨC NĂNG CHAT (CÓ LƯU LỊCH SỬ) ---
        public async Task<string> GetChatResponseAsync(string userMessage, int userId)
        {
            if (string.IsNullOrEmpty(_apiKey)) return "⚠️ Lỗi: Chưa cấu hình API Key.";

            // 1. Lưu tin nhắn User
            var userMsg = new ChatMessage { UserId = userId, Role = "user", Content = userMessage, Timestamp = DateTime.Now };
            _context.ChatMessages.Add(userMsg);
            await _context.SaveChangesAsync();

            // 2. Lấy lịch sử chat (20 tin gần nhất)
            var history = await _context.ChatMessages
                .Where(m => m.UserId == userId)
                .OrderByDescending(m => m.Timestamp)
                .Take(20)
                .OrderBy(m => m.Timestamp)
                .ToListAsync();

            // 3. Tạo Prompt hệ thống
            var contents = new List<object>();
            
            // System instruction giả lập
            var systemPrompt = "VAI TRÒ: Chuyên gia Tài chính. PHONG CÁCH: Thân thiện, ngắn gọn, dùng emoji 💰.";
            contents.Add(new { role = "user", parts = new[] { new { text = systemPrompt } } });
            contents.Add(new { role = "model", parts = new[] { new { text = "OK, tôi đã hiểu. Tôi sẵn sàng hỗ trợ!" } } });

            // Thêm lịch sử chat vào context
            foreach (var msg in history)
            {
                if (!string.IsNullOrWhiteSpace(msg.Content))
                    contents.Add(new { role = msg.Role == "user" ? "user" : "model", parts = new[] { new { text = msg.Content } } });
            }

            // 4. Gọi Gemini
            var requestBody = new
            {
                contents = contents,
                generationConfig = new { temperature = 0.7 }
            };

            var jsonContent = new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json");
            string modelName = "gemini-flash-latest"; // Dùng model mới ổn định hơn
            string apiUrl = $"https://generativelanguage.googleapis.com/v1beta/models/{modelName}:generateContent?key={_apiKey}";

            string botReply = "⚠️ Xin lỗi, tôi đang gặp sự cố kết nối.";
            try
            {
                var response = await _httpClient.PostAsync(apiUrl, jsonContent);
                var responseString = await response.Content.ReadAsStringAsync();

                if (!response.IsSuccessStatusCode)
                {
                    Console.WriteLine($"❌ Chat Error: {response.StatusCode} - {responseString}");
                    botReply = "⚠️ Hệ thống AI đang bảo trì. Vui lòng thử lại sau.";
                }
                else 
                {
                    using var doc = JsonDocument.Parse(responseString);
                    if (doc.RootElement.TryGetProperty("candidates", out var candidates) && candidates.GetArrayLength() > 0)
                    {
                        var content = candidates[0].GetProperty("content");
                        if (content.TryGetProperty("parts", out var parts))
                        {
                            botReply = parts[0].GetProperty("text").GetString() ?? "AI trả về rỗng.";
                        }
                    }
                }
            }
            catch (Exception ex) { Console.WriteLine("❌ Exception Chat: " + ex.Message); }

            // 5. Lưu tin nhắn Bot
            var botMsg = new ChatMessage { UserId = userId, Role = "model", Content = botReply, Timestamp = DateTime.Now };
            _context.ChatMessages.Add(botMsg);
            await _context.SaveChangesAsync();

            return botReply;
        }

        // --- 2. CHỨC NĂNG TẠO VECTOR (ĐÃ FIX LỖI CRASH) ---
        public async Task<float[]> GetEmbeddingAsync(string text)
        {
            if (string.IsNullOrEmpty(_apiKey)) return new float[768];

            var apiUrl = $"https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key={_apiKey}";
            var payload = new { 
                model = "models/text-embedding-004", 
                content = new { parts = new[] { new { text = text } } } 
            };

            var jsonContent = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");

            try
            {
                var response = await _httpClient.PostAsync(apiUrl, jsonContent);
                var responseString = await response.Content.ReadAsStringAsync();

                // 🔥 QUAN TRỌNG: Kiểm tra lỗi từ Google trước khi đọc dữ liệu
                if (!response.IsSuccessStatusCode)
                {
                    Console.WriteLine($"⚠️ [Gemini Embed Error] {response.StatusCode}: {responseString}");
                    return new float[768]; // Trả về vector rỗng thay vì làm sập app
                }

                // Parse an toàn
                using var doc = JsonDocument.Parse(responseString);
                
                // Dùng TryGetProperty để tránh lỗi "Key not found"
                if (doc.RootElement.TryGetProperty("embedding", out var embeddingElement))
                {
                    if (embeddingElement.TryGetProperty("values", out var valuesElement))
                    {
                        var values = valuesElement.EnumerateArray();
                        return values.Select(v => v.GetSingle()).ToArray();
                    }
                }
                
                Console.WriteLine($"⚠️ Không tìm thấy vector trong phản hồi: {responseString}");
                return new float[768];
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ [Gemini Exception]: {ex.Message}");
                return new float[768];
            }
        }

        // --- 3. CHỨC NĂNG ĐỌC HÓA ĐƠN (OCR) ---
        public async Task<string> AnalyzeImageAsync(Stream imageStream, string mimeType)
        {
            if (string.IsNullOrEmpty(_apiKey)) return "{}";

            string base64Image;
            using (var memoryStream = new MemoryStream())
            {
                await imageStream.CopyToAsync(memoryStream);
                base64Image = Convert.ToBase64String(memoryStream.ToArray());
            }

            var prompt = "Bạn là hệ thống OCR hóa đơn. Hãy trích xuất thông tin và trả về JSON thuần (không markdown) gồm: " +
                         "storeName (string), totalAmount (number), date (string DD/MM/YYYY), items (array string). " +
                         "Nếu không đọc được, hãy trả về json rỗng {}.";

            var payload = new
            {
                contents = new[] { new { parts = new object[] { new { text = prompt }, new { inline_data = new { mime_type = mimeType, data = base64Image } } } } },
                generationConfig = new { temperature = 0.4 }
            };

            string modelName = "gemini-flash-latest"; 
            string apiUrl = $"https://generativelanguage.googleapis.com/v1beta/models/{modelName}:generateContent?key={_apiKey}";

            try
            {
                var response = await _httpClient.PostAsync(apiUrl, new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json"));
                var responseString = await response.Content.ReadAsStringAsync();
 
                if (!response.IsSuccessStatusCode)
                {
                    Console.WriteLine($"❌ Vision Error: {responseString}");
                    return "{}";
                }

                using var doc = JsonDocument.Parse(responseString);
                if (doc.RootElement.TryGetProperty("candidates", out var candidates) && candidates.GetArrayLength() > 0)
                {
                    var content = candidates[0].GetProperty("content");
                    if(content.TryGetProperty("parts", out var parts))
                    {
                        var text = parts[0].GetProperty("text").GetString();
                        text = text?.Replace("```json", "").Replace("```", "").Trim();
                        return text ?? "{}";
                    }
                }
                return "{}";
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ LỖI VISION: {ex.Message}");
                return "{}";
            }
        }
    }
}