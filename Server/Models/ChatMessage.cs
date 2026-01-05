using System.ComponentModel.DataAnnotations;

namespace FinanceJarApp.Server.Models
{
    public class ChatMessage
    {
        [Key]
        public int Id { get; set; }

        public int UserId { get; set; } // Chat của ai người nấy nhớ

        public string Role { get; set; } = "user"; // "user" hoặc "model" (bot)
        
        public string Content { get; set; } = string.Empty; // Nội dung tin nhắn
        
        public DateTime Timestamp { get; set; } = DateTime.Now;
    }
}