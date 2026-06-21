using System.Text;
using FinanceJarApp.Server.Data;
using FinanceJarApp.Server.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer; // 👈 Thư viện quan trọng
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models; // Dùng cho Swagger

var builder = WebApplication.CreateBuilder(args);

// --- 1. CẤU HÌNH DỊCH VỤ (SERVICES) ---

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

// Cấu hình Swagger để test được Token (Nút Authorize)
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "FinanceJar API", Version = "v1" });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "Nhập token theo dạng: Bearer {token}",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement{
    {
        new OpenApiSecurityScheme{
            Reference = new OpenApiReference{
                Type = ReferenceType.SecurityScheme,
                Id = "Bearer"
            }
        },
        new string[]{}
    }});
});

// Kết nối Database MySQL
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseMySql(connectionString, ServerVersion.AutoDetect(connectionString)));

// 👇👇👇 ĐOẠN FIX LỖI "No authenticationScheme" Ở ĐÂY 👇👇👇
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false;
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = builder.Configuration["Jwt:Issuer"],
        ValidAudience = builder.Configuration["Jwt:Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]))
    };
});
// 👆👆👆 HẾT ĐOẠN FIX LỖI 👆👆👆

// Đăng ký các Service
builder.Services.AddHttpClient<GeminiService>(); // Tự động tạo HttpClient
builder.Services.AddScoped<IGeminiService>(sp => sp.GetRequiredService<GeminiService>());
builder.Services.AddSingleton<QdrantService>();
builder.Services.AddHostedService<AICoachingService>(); // 🎯 Background Service: Tạo thử thách AI mỗi tuần

// CORS (Cho phép Frontend gọi vào)
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll",
        b => b.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader());
});

var app = builder.Build();

// --- 2. LOGIC TỰ ĐỘNG HỌC (AUTO-LEARN) ---
// (Giữ nguyên logic cũ của bạn để bot học bài)
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        var qdrantService = services.GetRequiredService<QdrantService>();
        var geminiService = services.GetRequiredService<GeminiService>();

        await qdrantService.InitializeAsync();

        if (await qdrantService.IsMemoryEmpty())
        {
            Console.WriteLine("📂 [Auto-Learn] Bộ nhớ rỗng. Đang đọc file knowledge.txt...");
            string filePath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "Data", "knowledge.txt");

            if (File.Exists(filePath))
            {
                string content = await File.ReadAllTextAsync(filePath);
                var lines = content.Split(new[] { "\r\n", "\n" }, StringSplitOptions.RemoveEmptyEntries);
                
                int count = 0;
                foreach (var line in lines)
                {
                    if (line.Length < 10) continue;
                    try 
                    {
                        float[] vector = await geminiService.GetEmbeddingAsync(line); 
                        await qdrantService.SaveMemoryAsync(line, vector);
                        count++;
                        if(count % 5 == 0) Console.Write(".");
                    }
                    catch { }
                }
                Console.WriteLine($"\n🎉 [Auto-Learn] Đã nạp xong {count} dòng kiến thức!");
            }
            else
            {
                Console.WriteLine($"⚠️ [Auto-Learn] Không tìm thấy file: {filePath}");
            }
        }
        else
        {
            Console.WriteLine("✅ [Auto-Learn] Bộ nhớ đã có dữ liệu. Sẵn sàng!");
        }
    }
    catch (Exception ex)
    {
        Console.WriteLine("❌ Lỗi khởi tạo hệ thống: " + ex.Message);
    }
}

// --- 3. MIDDLEWARE ---
app.UseCors("AllowAll");

// Ép bật Swagger để bạn dễ test
app.UseSwagger();
app.UseSwaggerUI();

app.UseHttpsRedirection();

// Thứ tự 2 dòng này cực kỳ quan trọng:
app.UseAuthentication(); // 1. Kiểm tra danh tính
app.UseAuthorization();  // 2. Kiểm tra quyền hạn

app.MapControllers();

app.Run();