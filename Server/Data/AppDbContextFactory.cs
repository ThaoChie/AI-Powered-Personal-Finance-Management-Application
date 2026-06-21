using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace FinanceJarApp.Server.Data
{
    /// <summary>
    /// Factory dùng cho EF Core CLI (dotnet ef migrations add ...) ở thời điểm design-time.
    /// Không cần kết nối DB thật — chỉ cần MySQL version cố định để sinh migration file.
    /// </summary>
    public class AppDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
    {
        public AppDbContext CreateDbContext(string[] args)
        {
            var optionsBuilder = new DbContextOptionsBuilder<AppDbContext>();

            // Dùng version MySQL cố định để không cần kết nối thật lúc tạo migration
            optionsBuilder.UseMySql(
                "Server=localhost;Database=designtime_placeholder;User=root;Password=root;",
                new MySqlServerVersion(new Version(8, 0, 36))
            );

            return new AppDbContext(optionsBuilder.Options);
        }
    }
}
