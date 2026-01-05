using System;
using System.ComponentModel.DataAnnotations;

namespace FinanceJarApp.Server.DTOs
{
    // Dùng khi thêm thu nhập hoặc chi tiêu
    public class CreateTransactionDto
    {
        [Required]
        public string Description { get; set; } = string.Empty;

        [Required]
        [Range(0.01, double.MaxValue, ErrorMessage = "Số tiền phải lớn hơn 0")]
        public decimal Amount { get; set; }

        public DateTime Date { get; set; } = DateTime.Now;

        // Quan trọng: Giao dịch này thuộc hũ nào?
        [Required]
        public int JarId { get; set; } 
    }

    // Dùng để hiển thị lịch sử giao dịch
    public class TransactionDto
    {
        public int Id { get; set; }
        public string Description { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public DateTime Date { get; set; }
        public int JarId { get; set; }
        public string JarName { get; set; } = string.Empty; // Tiện để hiển thị tên hũ luôn
    }
}