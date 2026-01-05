using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using FinanceJarApp.Server.Data;
using FinanceJarApp.Server.Models;
using System.Security.Claims;

namespace FinanceJarApp.Server.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize] // 🔒 Bắt buộc đăng nhập
    public class TransactionsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public TransactionsController(AppDbContext context)
        {
            _context = context;
        }

        private int GetUserId()
        {
            var idClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return idClaim != null ? int.Parse(idClaim) : 0;
        }

        // GET: api/Transactions (Lấy lịch sử giao dịch)
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Transaction>>> GetTransactions()
        {
            int userId = GetUserId();

            // 👇 Lọc giao dịch: Phải join vào bảng Jar để check UserId
            return await _context.Transactions
                .Include(t => t.Jar) // Kèm thông tin Hũ
                .Where(t => t.Jar.UserId == userId) // Chỉ lấy nếu Hũ thuộc về User này
                .OrderByDescending(t => t.Date) // Mới nhất lên đầu
                .ToListAsync();
        }

        // POST: api/Transactions (Thêm giao dịch mới)
        [HttpPost]
        public async Task<ActionResult<Transaction>> PostTransaction(TransactionDto dto)
        {
            int userId = GetUserId();

            // 1. Kiểm tra xem Hũ (JarId) gửi lên có phải của User này không?
            // (Tránh trường hợp User A hack gửi tiền vào hũ của User B)
            var jar = await _context.Jars.FirstOrDefaultAsync(j => j.Id == dto.JarId && j.UserId == userId);
            
            if (jar == null)
            {
                return BadRequest("Hũ không tồn tại hoặc không thuộc về bạn!");
            }

            // 2. Tạo giao dịch
            var transaction = new Transaction
            {
                Description = dto.Description,
                Amount = dto.Amount,
                Date = dto.Date,
                JarId = dto.JarId
            };

            // 3. Cập nhật số dư của Hũ
            jar.Balance += dto.Amount;

            _context.Transactions.Add(transaction);
            await _context.SaveChangesAsync();

            return Ok(transaction);
        }
    }

    // Class DTO nhận dữ liệu từ Frontend (để code gọn hơn)
    public class TransactionDto
    {
        public string Description { get; set; }
        public decimal Amount { get; set; }
        public DateTime Date { get; set; }
        public int JarId { get; set; }
    }
}