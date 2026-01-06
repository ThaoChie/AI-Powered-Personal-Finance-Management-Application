using FinanceJarApp.Server.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// Cấu hình URL (quan trọng cho Docker)
builder.WebHost.UseUrls("http://*:8080"); // Đã sửa localhost -> * để nhận kết nối từ ngoài

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddScoped<FinanceJarApp.Server.Services.GeminiService>();
builder.Services.AddSingleton<FinanceJarApp.Server.Services.QdrantService>();

// 👇 CẤU HÌNH MYSQL (Code này là đúng nhé!)
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseMySql(connectionString, ServerVersion.AutoDetect(connectionString)));

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
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

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll",
        policy =>
        {
            policy.AllowAnyOrigin()
                  .AllowAnyMethod()
                  .AllowAnyHeader();
        });
});

var app = builder.Build();

// 👇👇👇 QUAN TRỌNG: ĐOẠN NÀY ĐỂ FIX LỖI "ĐĂNG KÝ THẤT BẠI"
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        var context = services.GetRequiredService<AppDbContext>();
        
        // 1. Đợi DB khởi động (thử kết nối)
        if (context.Database.CanConnect()) {
             Console.WriteLine("✅ Đã kết nối được Database MySQL!");
        }

        // 2. Dùng EnsureCreated thay vì Migrate để chắc chắn tạo được bảng
        // (Nó sẽ bỏ qua Migrations bị lỗi và tự xây bảng dựa trên Code)
        context.Database.EnsureCreated(); 
        
        // 3. Nạp dữ liệu mẫu
        DbInitializer.Initialize(context); 
        Console.WriteLine("✅ Đã khởi tạo dữ liệu mẫu thành công!");
    }
    catch (Exception ex)
    {
        var logger = services.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "❌ Lỗi xảy ra khi khởi tạo Database.");
    }
}
// 👆👆👆 HẾT PHẦN SỬA

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowAll"); 

app.UseAuthentication(); 
app.UseAuthorization();  
app.MapControllers();

app.Run();