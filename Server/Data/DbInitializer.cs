using FinanceJarApp.Server.Models;
using Microsoft.EntityFrameworkCore;

namespace FinanceJarApp.Server.Data
{
    public static class DbInitializer
    {
        public static void Initialize(AppDbContext context)
        {
            // Kiểm tra xem database đã có User chưa, nếu chưa thì tạo User mẫu
            if (!context.Users.Any())
            {
                var user = new User
                {
                    Username = "thaochie",
                    Email = "thaochie@example.com",
                    FullName = "Thao Chie",
                    // Password là "123456" đã được hash (đây chỉ là ví dụ mẫu)
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("123456") 
                };
                context.Users.Add(user);
                context.SaveChanges();
            }

            // Lấy User đầu tiên ra để gán Hũ
            var defaultUser = context.Users.First();

            // Kiểm tra xem đã có Hũ nào chưa
            if (context.Jars.Any())
            {
                return;   // DB đã có dữ liệu, không cần thêm nữa
            }

            var jars = new Jar[]
            {
                new Jar { 
                    Name = "Thiết yếu (NEC)", 
                    Balance = 0, 
                    Percent = 55,      // Sửa AllocationPercent -> Percent
                    Goal = 0,          // Sửa GoalAmount -> Goal
                    UserId = defaultUser.Id 
                },
                new Jar { 
                    Name = "Hưởng thụ (PLAY)", 
                    Balance = 0, 
                    Percent = 10,      // Sửa tên biến
                    Goal = 0,          // Sửa tên biến
                    UserId = defaultUser.Id 
                },
                new Jar { 
                    Name = "Đầu tư (FFA)", 
                    Balance = 0, 
                    Percent = 10, 
                    Goal = 0, 
                    UserId = defaultUser.Id 
                },
                new Jar { 
                    Name = "Tiết kiệm dài hạn (LTSS)", 
                    Balance = 0, 
                    Percent = 10, 
                    Goal = 0, 
                    UserId = defaultUser.Id 
                },
                new Jar { 
                    Name = "Cho đi (GIVE)", 
                    Balance = 0, 
                    Percent = 5, 
                    Goal = 0, 
                    UserId = defaultUser.Id 
                },
                new Jar { 
                    Name = "Giáo dục (EDU)", 
                    Balance = 0, 
                    Percent = 10, 
                    Goal = 0, 
                    UserId = defaultUser.Id 
                }
            };

            context.Jars.AddRange(jars);
            context.SaveChanges();
        }
    }
}