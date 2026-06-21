using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using FluentAssertions;
using FinanceJarApp.Server.Data;
using FinanceJarApp.Server.Models;
using Microsoft.EntityFrameworkCore;

namespace FinanceJarApp.Tests;

// ─────────────────────────────────────────────────────────────
//  Helper: tạo HMAC-SHA256 signature giống ngân hàng ký
// ─────────────────────────────────────────────────────────────
file static class HmacHelper
{
    public const string Secret = "test-webhook-secret-key";

    public static string Sign(string payload)
    {
        var keyBytes = Encoding.UTF8.GetBytes(Secret);
        var payloadBytes = Encoding.UTF8.GetBytes(payload);
        using var hmac = new HMACSHA256(keyBytes);
        return Convert.ToHexString(hmac.ComputeHash(payloadBytes)).ToLower();
    }
}

// ─────────────────────────────────────────────────────────────
//  Fake Webhook handler (giả lập logic webhook controller)
//  vì codebase chưa có BankSyncController; ta unit-test logic
// ─────────────────────────────────────────────────────────────
file static class BankWebhookHandler
{
    /// <summary>
    /// Xử lý webhook payload. Trả về (statusCode, message).
    /// statusCode: 200 = OK, 400 = Bad Request, 401 = Invalid signature.
    /// </summary>
    public static async Task<(int StatusCode, string Message)> HandleAsync(
        AppDbContext db,
        string payload,
        string? signatureHeader,
        string secret)
    {
        // BANK-03: thiếu header
        if (string.IsNullOrEmpty(signatureHeader))
            return (400, "Missing X-Signature header");

        // BANK-02: HMAC verify
        var expected = HmacHelper.Sign(payload); // dùng chung helper
        var keyBytes = Encoding.UTF8.GetBytes(secret);
        using var hmac = new HMACSHA256(keyBytes);
        var computed = Convert.ToHexString(
            hmac.ComputeHash(Encoding.UTF8.GetBytes(payload))).ToLower();

        if (!CryptographicOperations.FixedTimeEquals(
                Encoding.UTF8.GetBytes(computed),
                Encoding.UTF8.GetBytes(signatureHeader.ToLower())))
            return (401, "Invalid HMAC signature");

        // Parse payload
        using var doc = JsonDocument.Parse(payload);
        var root = doc.RootElement;
        var externalId = root.GetProperty("transactionId").GetString()!;
        var jarId = root.GetProperty("jarId").GetInt32();
        var amount = root.GetProperty("amount").GetDecimal();

        // BANK-04: idempotent – duplicate transactionId
        bool duplicate = await db.Transactions
            .AnyAsync(t => t.Description == $"BANK:{externalId}");
        if (duplicate)
            return (200, "Duplicate – ignored");

        // BANK-06: JarId không tồn tại
        var jar = await db.Jars.FindAsync(jarId);
        if (jar == null)
            return (400, "Jar not found");

        // Tạo giao dịch
        db.Transactions.Add(new Transaction
        {
            JarId = jarId,
            Amount = amount,
            Date = DateTime.UtcNow,
            Description = $"BANK:{externalId}"
        });
        jar.Balance += amount;
        await db.SaveChangesAsync();

        return (200, "OK");
    }
}

// ─────────────────────────────────────────────────────────────
//  TEST CLASS
// ─────────────────────────────────────────────────────────────
public class BankSyncTests : IDisposable
{
    private readonly AppDbContext _db;
    private readonly User _user;
    private readonly Jar _jar;

    public BankSyncTests()
    {
        var opts = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        _db = new AppDbContext(opts);

        _user = new User { Username = "test", Email = "test@test.com", PasswordHash = "x", FullName = "Test" };
        _db.Users.Add(_user);
        _db.SaveChanges();

        _jar = new Jar { Name = "Savings", UserId = _user.Id, Balance = 0 };
        _db.Jars.Add(_jar);
        _db.SaveChanges();
    }

    public void Dispose() => _db.Dispose();

    private static string BuildPayload(string txId, int jarId, decimal amount) =>
        JsonSerializer.Serialize(new { transactionId = txId, jarId, amount });

    // ── BANK-01: Main – HMAC hợp lệ → 200, tạo Transaction ──
    [Fact]
    public async Task ValidHmac_CreatesTransaction_Returns200()
    {
        var payload = BuildPayload("TX001", _jar.Id, 500_000m);
        var sig = HmacHelper.Sign(payload);

        var (code, _) = await BankWebhookHandler.HandleAsync(_db, payload, sig, HmacHelper.Secret);

        code.Should().Be(200);
        _db.Transactions.Should().ContainSingle(t => t.Description == "BANK:TX001");
        (await _db.Jars.FindAsync(_jar.Id))!.Balance.Should().Be(500_000m);
    }

    // ── BANK-02: Exception – signature sai → 401 ──
    [Fact]
    public async Task InvalidHmac_Returns401()
    {
        var payload = BuildPayload("TX002", _jar.Id, 100_000m);
        var badSig = "0000000000000000000000000000000000000000000000000000000000000000";

        var (code, msg) = await BankWebhookHandler.HandleAsync(_db, payload, badSig, HmacHelper.Secret);

        code.Should().Be(401);
        msg.Should().Contain("Invalid");
        _db.Transactions.Should().BeEmpty();
    }

    // ── BANK-03: Exception – thiếu header → 400 ──
    [Fact]
    public async Task MissingSignatureHeader_Returns400()
    {
        var payload = BuildPayload("TX003", _jar.Id, 100_000m);

        var (code, msg) = await BankWebhookHandler.HandleAsync(_db, payload, null, HmacHelper.Secret);

        code.Should().Be(400);
        msg.Should().Contain("Missing");
    }

    // ── BANK-04: Edge – duplicate transactionId → 200 nhưng không insert ──
    [Fact]
    public async Task DuplicateTransactionId_Idempotent_Returns200()
    {
        var payload = BuildPayload("TX004", _jar.Id, 200_000m);
        var sig = HmacHelper.Sign(payload);

        await BankWebhookHandler.HandleAsync(_db, payload, sig, HmacHelper.Secret); // lần 1
        var (code, msg) = await BankWebhookHandler.HandleAsync(_db, payload, sig, HmacHelper.Secret); // lần 2

        code.Should().Be(200);
        msg.Should().Contain("Duplicate");
        _db.Transactions.Count(t => t.Description == "BANK:TX004").Should().Be(1); // chỉ 1 bản ghi
    }

    // ── BANK-05: Edge – amount âm (hoàn tiền) → balance giảm đúng ──
    [Fact]
    public async Task NegativeAmount_DecreasesBalance()
    {
        // Nạp trước
        _jar.Balance = 1_000_000m;
        await _db.SaveChangesAsync();

        var payload = BuildPayload("TX005", _jar.Id, -300_000m);
        var sig = HmacHelper.Sign(payload);

        var (code, _) = await BankWebhookHandler.HandleAsync(_db, payload, sig, HmacHelper.Secret);

        code.Should().Be(200);
        (await _db.Jars.FindAsync(_jar.Id))!.Balance.Should().Be(700_000m);
    }

    // ── BANK-06: Alt – JarId không tồn tại → 400 ──
    [Fact]
    public async Task InvalidJarId_Returns400_NoTransaction()
    {
        var payload = BuildPayload("TX006", 9999, 100_000m);
        var sig = HmacHelper.Sign(payload);

        var (code, msg) = await BankWebhookHandler.HandleAsync(_db, payload, sig, HmacHelper.Secret);

        code.Should().Be(400);
        msg.Should().Contain("Jar not found");
        _db.Transactions.Should().BeEmpty();
    }
}
