using System.ComponentModel.DataAnnotations;

namespace FinanceJarApp.Server.DTOs
{
    // Dùng khi người dùng tạo mới một hũ
    public class CreateJarDto
    {
        [Required(ErrorMessage = "Tên hũ không được để trống")]
        public string Name { get; set; } = string.Empty;

        [Range(0, 100, ErrorMessage = "Phần trăm phải từ 0 đến 100")]
        public double TargetPercentage { get; set; } // Ví dụ: 55% cho Thiết yếu
    }

    // Dùng khi cập nhật hũ
    public class UpdateJarDto
    {
        public string Name { get; set; }
        public double TargetPercentage { get; set; }
    }

    // Dùng để trả dữ liệu về cho Client hiển thị
    public class JarDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public double TargetPercentage { get; set; }
        public decimal Balance { get; set; } // Số tiền hiện tại trong hũ
    }
}