using System.Text;
using System.Text.Json;
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

        public GeminiService(IConfiguration config, AppDbContext context)
        {
            _httpClient = new HttpClient();
            _context = context;

            var rawKey = config["GeminiKey"];
            if (string.IsNullOrWhiteSpace(rawKey))
            {
                throw new Exception("❌ LỖI: Chưa có 'GeminiKey' trong file appsettings.json!");
            }
            // Xóa sạch khoảng trắng, xuống dòng thừa
            _apiKey = rawKey.Replace(" ", "").Replace("\n", "").Replace("\r", "").Replace("\t", "").Trim();
        }

        public async Task<string> GetChatResponseAsync(string userMessage, int userId)
        {
            var userMsg = new ChatMessage { UserId = userId, Role = "user", Content = userMessage, Timestamp = DateTime.Now };
            _context.ChatMessages.Add(userMsg);
            await _context.SaveChangesAsync();

            var history = await _context.ChatMessages
                .Where(m => m.UserId == userId)
                .OrderByDescending(m => m.Timestamp)
                .Take(20)
                .OrderBy(m => m.Timestamp)
                .ToListAsync();

            var systemPrompt = new StringBuilder();
            systemPrompt.AppendLine("VAI TRÒ: Chuyên gia Tài chính (AI Financial Advisor).");
            systemPrompt.AppendLine("PHONG CÁCH: Thân thiện, ngắn gọn.");
            systemPrompt.AppendLine("QUY TẮC: Dùng Emoji 💰, xuống dòng rõ ràng.");

            var contents = new List<object>
            {
                new { role = "user", parts = new[] { new { text = systemPrompt.ToString() } } }
            };

            foreach (var msg in history)
            {
                if (!string.IsNullOrWhiteSpace(msg.Content))
                    contents.Add(new { role = msg.Role == "user" ? "user" : "model", parts = new[] { new { text = msg.Content } } });
            }

            var requestBody = new
            {
                contents = contents,
                generationConfig = new { temperature = 0.7 }
            };

            var jsonContent = new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json");
            string modelName = "gemini-flash-latest";
            string apiUrl = $"https://generativelanguage.googleapis.com/v1beta/models/{modelName}:generateContent?key={_apiKey}";

            var response = await _httpClient.PostAsync(apiUrl, jsonContent);
            var responseString = await response.Content.ReadAsStringAsync();

            string botReply = "⚠️ Lỗi kết nối AI.";
            try
            {
                using var doc = JsonDocument.Parse(responseString);
                if (doc.RootElement.TryGetProperty("candidates", out var candidates) && candidates.GetArrayLength() > 0)
                {
                    botReply = candidates[0].GetProperty("content").GetProperty("parts")[0].GetProperty("text").GetString() ?? "AI rỗng.";
                }
            }
            catch { /* Ignore */ }

            var botMsg = new ChatMessage { UserId = userId, Role = "model", Content = botReply, Timestamp = DateTime.Now };
            _context.ChatMessages.Add(botMsg);
            await _context.SaveChangesAsync();

            return botReply;
        }

        public async Task<float[]> GetEmbeddingAsync(string text)
        {
            var apiUrl = $"https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key={_apiKey}";
            var payload = new { model = "models/text-embedding-004", content = new { parts = new[] { new { text = text } } } };

            var jsonContent = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
            var response = await _httpClient.PostAsync(apiUrl, jsonContent);
            var responseString = await response.Content.ReadAsStringAsync();

            using var doc = JsonDocument.Parse(responseString);
            var values = doc.RootElement.GetProperty("embedding").GetProperty("values");
            var vector = new float[values.GetArrayLength()];
            int i = 0;
            foreach (var val in values.EnumerateArray()) vector[i++] = val.GetSingle();
            return vector;
        }

        public async Task<string> AnalyzeImageAsync(Stream imageStream, string mimeType)
        {
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

            Console.WriteLine($"🚀 Đang gửi ảnh đi... (Size: {base64Image.Length})");

            try
            {
                var response = await _httpClient.PostAsync(apiUrl, new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json"));
                var responseString = await response.Content.ReadAsStringAsync();
 
                Console.WriteLine("🔍 KẾT QUẢ TỪ GOOGLE:\n" + responseString); 

                using var doc = JsonDocument.Parse(responseString);
                if (doc.RootElement.TryGetProperty("candidates", out var candidates) && candidates.GetArrayLength() > 0)
                {
                    var content = candidates[0].GetProperty("content");
                    if(content.TryGetProperty("parts", out var parts))
                    {
                        var text = parts[0].GetProperty("text").GetString();
                        text = text.Replace("```json", "").Replace("```", "").Trim();
                        Console.WriteLine("✅ JSON Sạch: " + text);
                        return text;
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