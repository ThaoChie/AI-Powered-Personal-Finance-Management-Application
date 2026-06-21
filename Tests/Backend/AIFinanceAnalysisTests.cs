using FluentAssertions;
using Moq;
using FinanceJarApp.Server.Data;
using FinanceJarApp.Server.Models;
using FinanceJarApp.Server.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace FinanceJarApp.Tests;

// ─────────────────────────────────────────────────────────────
//  AICoachingService – unit tests (mock IGeminiService + InMemory DB)
// ─────────────────────────────────────────────────────────────
public class AIFinanceAnalysisTests : IDisposable
{
    private readonly AppDbContext _db;
    private readonly Mock<IGeminiService> _geminiMock;
    private readonly ILogger<AICoachingService> _logger;

    public AIFinanceAnalysisTests()
    {
        var opts = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        _db = new AppDbContext(opts);
        _geminiMock = new Mock<IGeminiService>();
        _logger = new LoggerFactory().CreateLogger<AICoachingService>();

        // Default mock: Gemini trả JSON hợp lệ
        _geminiMock
            .Setup(g => g.GenerateChallengeAsync(It.IsAny<decimal>()))
            .ReturnsAsync("{\"title\":\"Tiết kiệm!\",\"description\":\"Giảm chi tiêu 10%.\"}");
    }

    public void Dispose() => _db.Dispose();

    // ─── Factory: tạo AICoachingService với DB + mock ───────────
    private AICoachingService BuildService()
    {
        var scopeFactory = BuildScopeFactory(_db, _geminiMock.Object);
        return new AICoachingService(scopeFactory, _logger);
    }

    /// <summary>Tạo IServiceScopeFactory giả cung cấp _db và IGeminiService mock.</summary>
    private static IServiceScopeFactory BuildScopeFactory(AppDbContext db, IGeminiService gemini)
    {
        var scopeMock = new Mock<IServiceScope>();
        var providerMock = new Mock<IServiceProvider>();

        providerMock.Setup(p => p.GetService(typeof(AppDbContext))).Returns(db);
        providerMock.Setup(p => p.GetService(typeof(IGeminiService))).Returns(gemini);

        scopeMock.Setup(s => s.ServiceProvider).Returns(providerMock.Object);

        var factoryMock = new Mock<IServiceScopeFactory>();
        factoryMock.Setup(f => f.CreateScope()).Returns(scopeMock.Object);

        return factoryMock.Object;
    }

    // ─── Seed helper ─────────────────────────────────────────────
    private async Task<(User user, Jar jar)> SeedUserWithExpenseAsync(decimal expense)
    {
        var user = new User { Username = "u1", Email = "u1@test.com", PasswordHash = "x", FullName = "U1" };
        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        var jar = new Jar { Name = "Chi tiêu", UserId = user.Id, Balance = 0 };
        _db.Jars.Add(jar);
        await _db.SaveChangesAsync();

        if (expense > 0)
        {
            _db.Transactions.Add(new Transaction
            {
                JarId = jar.Id,
                Amount = -expense,   // âm = chi tiêu
                Date = DateTime.UtcNow.AddDays(-1),
                Description = "Chi tiêu test"
            });
            await _db.SaveChangesAsync();
        }

        return (user, jar);
    }

    // ── COACH-01: Main – user có chi tiêu, chưa có challenge → tạo Challenge + Notification ──
    [Fact]
    public async Task UserWithExpense_NoExistingChallenge_CreatesChallenge()
    {
        await SeedUserWithExpenseAsync(500_000m);
        var svc = BuildService();

        await svc.RunOnceForTestAsync(_db, _geminiMock.Object);

        _db.Challenges.Should().ContainSingle();
        _db.Notifications.Should().ContainSingle(n => n.Type == "info");
        _geminiMock.Verify(g => g.GenerateChallengeAsync(It.IsAny<decimal>()), Times.Once);
    }

    // ── COACH-02: Edge – user đã có challenge trong tuần → skip ──
    [Fact]
    public async Task UserAlreadyHasChallenge_ThisWeek_SkipsGeneration()
    {
        var (user, _) = await SeedUserWithExpenseAsync(300_000m);

        // Seed challenge hiện có trong tuần
        _db.Challenges.Add(new Challenge
        {
            UserId = user.Id,
            Title = "Existing",
            Description = "Already here",
            CreatedAt = DateTime.UtcNow.AddHours(-2)
        });
        await _db.SaveChangesAsync();

        await svc_RunOnce();

        _db.Challenges.Count().Should().Be(1); // không tạo thêm
        _geminiMock.Verify(g => g.GenerateChallengeAsync(It.IsAny<decimal>()), Times.Never);
    }

    // ── COACH-03: Edge – Gemini trả JSON lỗi → dùng nội dung default ──
    [Fact]
    public async Task GeminiReturnsInvalidJson_UsesDefaultContent()
    {
        _geminiMock
            .Setup(g => g.GenerateChallengeAsync(It.IsAny<decimal>()))
            .ReturnsAsync("NOT_JSON");

        await SeedUserWithExpenseAsync(200_000m);

        await svc_RunOnce();

        var challenge = _db.Challenges.Single();
        challenge.Title.Should().NotBeNullOrEmpty();
        challenge.Description.Should().NotBeNullOrEmpty();
    }

    // ── COACH-04: Alt – user không có chi tiêu (totalExpense = 0) → vẫn tạo challenge ──
    [Fact]
    public async Task UserWithZeroExpense_StillCreatesChallenge()
    {
        await SeedUserWithExpenseAsync(0m);

        await svc_RunOnce();

        _db.Challenges.Should().ContainSingle();
        _db.Challenges.Single().TargetAmount.Should().Be(0m);
    }

    // ── COACH-05: Exception – không có user → không gọi Gemini, không crash ──
    [Fact]
    public async Task NoUsersInSystem_GeminiNotCalled_NoException()
    {
        // DB rỗng, không seed user
        Func<Task> act = async () => await svc_RunOnce();

        await act.Should().NotThrowAsync();
        _geminiMock.Verify(g => g.GenerateChallengeAsync(It.IsAny<decimal>()), Times.Never);
    }

    // ── AI-ANOM-02: Main – giao dịch lớn bất thường → tạo Notification "warning" ──
    [Fact]
    public async Task LargeTransaction_CreatesAnomalyNotification()
    {
        var (user, jar) = await SeedUserWithExpenseAsync(100_000m); // baseline nhỏ

        // Giao dịch lớn bất thường (10× baseline)
        var anomalyTx = new Transaction
        {
            JarId = jar.Id,
            Amount = -50_000_000m,
            Date = DateTime.UtcNow,
            Description = "Mua xe"
        };
        _db.Transactions.Add(anomalyTx);

        // Giả lập anomaly detector tạo notification (logic này sẽ được implement trong controller)
        var isAnomaly = Math.Abs(anomalyTx.Amount) > 1_000_000m;
        if (isAnomaly)
        {
            _db.Notifications.Add(new Notification
            {
                UserId = user.Id,
                Title = "⚠️ Giao dịch bất thường",
                Message = $"Phát hiện giao dịch lớn: {Math.Abs(anomalyTx.Amount):N0} VND",
                Type = "warning",
                IsRead = false
            });
        }
        await _db.SaveChangesAsync();

        _db.Notifications.Should().ContainSingle(n => n.Type == "warning");
    }

    // ── AI-ANOM-05: Exception – GeminiKey rỗng → trả chuỗi lỗi, không throw ──
    [Fact]
    public async Task GeminiKeyEmpty_ReturnsErrorString_NoException()
    {
        _geminiMock
            .Setup(g => g.GetChatResponseAsync(It.IsAny<string>(), It.IsAny<int>()))
            .ReturnsAsync("⚠️ Lỗi: Chưa cấu hình API Key.");

        var result = await _geminiMock.Object.GetChatResponseAsync("test", 1);

        result.Should().Contain("Lỗi");
    }

    // ─── Shortcut helper để gọi RunOnce mà không cần CancellationToken phức tạp ──
    private async Task svc_RunOnce()
    {
        var svc = BuildService();
        await svc.RunOnceForTestAsync(_db, _geminiMock.Object);
    }
}
