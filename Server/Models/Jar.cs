using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace FinanceJarApp.Server.Models
{
    public class Jar
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public string Name { get; set; } = string.Empty;

        public decimal Balance { get; set; } = 0;

        // 👇 THÊM 2 DÒNG NÀY 👇
        public double Percent { get; set; } = 0; // % phân bổ (VD: 55, 10...)
        public decimal Goal { get; set; } = 0;   // Mục tiêu tiết kiệm (VD: 50 triệu)

        public int UserId { get; set; }
        
        [JsonIgnore]
        public User? User { get; set; }

        [JsonIgnore]
        public ICollection<Transaction> Transactions { get; set; } = new List<Transaction>();
    }
}