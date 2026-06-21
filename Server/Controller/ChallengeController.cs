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
    [Authorize]
    public class ChallengeController : ControllerBase
    {
        private readonly AppDbContext _context;

        public ChallengeController(AppDbContext context)
        {
            _context = context;
        }

        private int GetUserId()
        {
            var idClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return idClaim != null ? int.Parse(idClaim) : 0;
        }

        // GET: api/Challenge — Lấy danh sách thử thách của User (mới nhất trước)
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Challenge>>> GetChallenges()
        {
            int userId = GetUserId();
            if (userId == 0) return Unauthorized();

            var challenges = await _context.Challenges
                .Where(c => c.UserId == userId)
                .OrderByDescending(c => c.CreatedAt)
                .Take(10)
                .ToListAsync();

            return Ok(challenges);
        }

        // GET: api/Challenge/current — Lấy thử thách tuần hiện tại (chưa hoàn thành)
        [HttpGet("current")]
        public async Task<ActionResult<Challenge>> GetCurrentChallenge()
        {
            int userId = GetUserId();
            if (userId == 0) return Unauthorized();

            var oneWeekAgo = DateTime.UtcNow.AddDays(-7);

            var challenge = await _context.Challenges
                .Where(c => c.UserId == userId && c.CreatedAt >= oneWeekAgo)
                .OrderByDescending(c => c.CreatedAt)
                .FirstOrDefaultAsync();

            if (challenge == null) return NotFound(new { message = "Chưa có thử thách tuần này." });

            return Ok(challenge);
        }

        // PUT: api/Challenge/{id}/complete — Đánh dấu thử thách hoàn thành
        [HttpPut("{id}/complete")]
        public async Task<IActionResult> CompleteChallenge(int id)
        {
            int userId = GetUserId();
            if (userId == 0) return Unauthorized();

            var challenge = await _context.Challenges
                .FirstOrDefaultAsync(c => c.Id == id && c.UserId == userId);

            if (challenge == null) return NotFound(new { message = "Thử thách không tồn tại." });

            if (challenge.IsCompleted)
                return BadRequest(new { message = "Thử thách này đã được hoàn thành trước đó." });

            challenge.IsCompleted = true;
            await _context.SaveChangesAsync();

            // Tạo thông báo chúc mừng
            var notification = new Notification
            {
                UserId = userId,
                Title = "🎉 Xuất sắc! Bạn đã hoàn thành thử thách!",
                Message = $"Bạn vừa hoàn thành: \"{challenge.Title}\". Tiếp tục giữ vững phong độ nhé!",
                Type = "info",
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            };
            _context.Notifications.Add(notification);
            await _context.SaveChangesAsync();

            return Ok(new { message = "🎉 Chúc mừng! Bạn đã hoàn thành thử thách!", challenge });
        }
    }
}
