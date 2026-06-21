using System.Text.Json;
using FinanceJarApp.Server.Data;
using FinanceJarApp.Server.Models;
using FinanceJarApp.Server.Services;
using Microsoft.EntityFrameworkCore;

namespace FinanceJarApp.Server.Services
{
    public class AICoachingService : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<AICoachingService> _logger;

        // Mỗi 1 phút để test (thực tế có thể chỉnh thành 7 ngày)
        private readonly TimeSpan _interval = TimeSpan.FromMinutes(1);

        public AICoachingService(IServiceScopeFactory scopeFactory, ILogger<AICoachingService> logger)
        {
            _scopeFactory = scopeFactory;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("🎯 [AICoachingService] Khởi động - Tạo thử thách tiết kiệm mỗi {Interval}", _interval);

            // Đợi 30 giây sau khi app khởi động trước khi chạy lần đầu
            await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await GenerateChallengesForAllUsers(stoppingToken);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "❌ [AICoachingService] Lỗi khi tạo thử thách");
                }

                await Task.Delay(_interval, stoppingToken);
            }
        }

        /// <summary>Entry point dành riêng cho unit test – inject trực tiếp db + gemini mock.</summary>
        public Task RunOnceForTestAsync(AppDbContext db, IGeminiService gemini)
            => GenerateChallengesForAllUsers(db, gemini, CancellationToken.None);

        private async Task GenerateChallengesForAllUsers(CancellationToken stoppingToken)
        {
            using var scope = _scopeFactory.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var geminiService = scope.ServiceProvider.GetRequiredService<IGeminiService>();
            await GenerateChallengesForAllUsers(context, geminiService, stoppingToken);
        }

        private async Task GenerateChallengesForAllUsers(AppDbContext context, IGeminiService geminiService, CancellationToken stoppingToken)
        {
            // Lấy danh sách User hiện có
            var users = await context.Users.ToListAsync(stoppingToken);

            if (!users.Any())
            {
                _logger.LogInformation("⚠️ [AICoachingService] Chưa có User nào trong hệ thống.");
                return;
            }

            var oneWeekAgo = DateTime.UtcNow.AddDays(-7);

            foreach (var user in users)
            {
                // Kiểm tra xem User này đã có thử thách trong tuần này chưa
                bool alreadyHasChallenge = await context.Challenges
                    .AnyAsync(c => c.UserId == user.Id && c.CreatedAt >= oneWeekAgo, stoppingToken);

                if (alreadyHasChallenge)
                {
                    _logger.LogInformation("✅ [AICoachingService] User {UserId} đã có thử thách tuần này, bỏ qua.", user.Id);
                    continue;
                }

                // Tính tổng chi tiêu 7 ngày qua của User
                var totalExpense = await context.Transactions
                    .Include(t => t.Jar)
                    .Where(t => t.Jar.UserId == user.Id && t.Amount < 0 && t.Date >= oneWeekAgo)
                    .SumAsync(t => Math.Abs(t.Amount), stoppingToken);

                _logger.LogInformation("💰 [AICoachingService] User {UserId} - Chi tiêu 7 ngày: {Expense:N0} VND", user.Id, totalExpense);

                // Gọi Gemini để tạo thử thách
                string challengeJson = await geminiService.GenerateChallengeAsync(totalExpense);

                string title = "Thử thách tiết kiệm tuần này!";
                string description = "Hãy cố gắng cắt giảm chi tiêu không cần thiết trong tuần tới.";
                decimal targetAmount = totalExpense * 0.1m; // Mặc định: tiết kiệm 10%

                try
                {
                    using var doc = JsonDocument.Parse(challengeJson);
                    title = doc.RootElement.GetProperty("title").GetString() ?? title;
                    description = doc.RootElement.GetProperty("description").GetString() ?? description;
                }
                catch
                {
                    _logger.LogWarning("⚠️ [AICoachingService] Không parse được JSON từ Gemini, dùng nội dung mặc định.");
                }

                // Lưu thử thách mới vào Database
                var newChallenge = new Challenge
                {
                    UserId = user.Id,
                    Title = title,
                    Description = description,
                    TargetAmount = targetAmount,
                    IsCompleted = false,
                    CreatedAt = DateTime.UtcNow
                };

                context.Challenges.Add(newChallenge);

                // Tạo thêm Notification cho User
                var notification = new Notification
                {
                    UserId = user.Id,
                    Title = "🎯 Thử thách mới từ AI Coach!",
                    Message = $"Tuần này: {title}",
                    Type = "info",
                    IsRead = false,
                    CreatedAt = DateTime.UtcNow
                };
                context.Notifications.Add(notification);

                _logger.LogInformation("✨ [AICoachingService] Đã tạo thử thách cho User {UserId}: {Title}", user.Id, title);
            }

            await context.SaveChangesAsync(stoppingToken);
        }
    }
}
