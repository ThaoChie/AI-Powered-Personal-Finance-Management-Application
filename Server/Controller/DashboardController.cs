using Microsoft.AspNetCore.Authorization; // 👈 MỚI: Để dùng [Authorize]
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using FinanceJarApp.Server.Data;
using System.Security.Claims; // 👈 MỚI: Để lấy ID từ Token

namespace FinanceJarApp.Server.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize] // 🔒 BẮT BUỘC PHẢI ĐĂNG NHẬP MỚI ĐƯỢC GỌI API NÀY
    public class DashboardController : ControllerBase
    {
        private readonly AppDbContext _context;

        public DashboardController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetDashboardData()
        {
            // 👇 THAY CODE CŨ BẰNG ĐOẠN NÀY ĐỂ LẤY ĐÚNG NGƯỜI DÙNG 👇
            var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdString)) return Unauthorized();
            int userId = int.Parse(userIdString);

            // 1. Tính tổng số dư các hũ CỦA USER NÀY
            var totalBalance = await _context.Jars
                .Where(j => j.UserId == userId) // 👈 Quan trọng: Lọc theo UserId
                .SumAsync(j => j.Balance);

            // 2. Lấy thu nhập/chi tiêu trong tháng này CỦA USER NÀY
            var now = DateTime.UtcNow;
            var startOfMonth = new DateTime(now.Year, now.Month, 1);
            
            // Vì Transaction liên kết với Jar, ta phải join bảng hoặc query lồng
            var transactions = await _context.Transactions
                .Include(t => t.Jar)
                .Where(t => t.Jar.UserId == userId && t.Date >= startOfMonth) // 👈 Lọc theo UserId của cái Hũ
                .ToListAsync();

            var income = transactions.Where(t => t.Amount > 0).Sum(t => t.Amount);
            var expense = transactions.Where(t => t.Amount < 0).Sum(t => t.Amount);

            return Ok(new
            {
                TotalBalance = totalBalance,
                MonthIncome = income,
                MonthExpense = Math.Abs(expense)
            });
        }
    }
}