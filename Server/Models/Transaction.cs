using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;
using FinanceJarApp.Server.Models;

namespace FinanceJarApp.Server.Models
{
    public class Transaction
    {
        [Key]
        public int Id { get; set; }

        public int JarId { get; set; }

        public DateTime Date { get; set; }

        // Số tiền giao dịch.
        // Quy ước: Số Âm (-) là Chi tiêu, Số Dương (+) là Thu nhập/Nạp tiền
        [Column(TypeName = "decimal(18, 2)")]
        public decimal Amount { get; set; }

        [MaxLength(200)]
        public string Description { get; set; } = string.Empty; // Mua cà phê, Lương tháng 10...

        public DateTime TransactionDate { get; set; } = DateTime.UtcNow;

        // Relationship
        [ForeignKey("JarId")]
        [JsonIgnore]
        public Jar? Jar { get; set; }
    }
}