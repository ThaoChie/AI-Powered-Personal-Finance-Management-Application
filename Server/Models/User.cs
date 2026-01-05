using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace FinanceJarApp.Server.Models
{
    public class User
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [MaxLength(50)]
        public string Username { get; set; } = string.Empty;

        // 👇 THÊM DÒNG NÀY (Để đăng nhập bằng Email)
        [Required]
        [MaxLength(100)]
        public string Email { get; set; } = string.Empty;

        [JsonIgnore]
        public string PasswordHash { get; set; } = string.Empty;

        [MaxLength(100)]
        public string FullName { get; set; } = string.Empty;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Relationship cũ giữ nguyên
        public ICollection<Jar> Jars { get; set; } = new List<Jar>();
    }
}