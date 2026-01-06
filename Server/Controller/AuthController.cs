using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using FinanceJarApp.Server.Data;
using FinanceJarApp.Server.Models;

namespace FinanceJarApp.Server.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IConfiguration _config;

        public AuthController(AppDbContext context, IConfiguration config)
        {
            _context = context;
            _config = config;
        }

        // --- ĐĂNG KÝ ---
        [HttpPost("register")]
        public async Task<IActionResult> Register(RegisterDto request)
        {
            try 
            {
                // 1. Kiểm tra Email trùng
                if (await _context.Users.AnyAsync(u => u.Email == request.Email))
                {
                    return BadRequest("Email này đã tồn tại.");
                }

                string passwordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);

                // 2. LOGIC "BẤT TỬ": Tự động điền nếu thiếu thông tin
                // Nếu Username thiếu -> Lấy Email
                string finalUsername = string.IsNullOrEmpty(request.Username) ? request.Email : request.Username;
                
                // Nếu FullName thiếu -> Lấy phần tên trước @ của email (ví dụ: phuongthao)
                string finalFullName = string.IsNullOrEmpty(request.FullName) 
                                       ? request.Email.Split('@')[0] 
                                       : request.FullName;

                var newUser = new User
                {
                    Username = finalUsername,
                    Email = request.Email,
                    PasswordHash = passwordHash,
                    FullName = finalFullName, // 👈 Đảm bảo không bao giờ bị null
                    CreatedAt = DateTime.Now  
                };

                _context.Users.Add(newUser);
                
                // 3. Lưu vào DB
                await _context.SaveChangesAsync();

                return Ok(new { message = "Đăng ký thành công!" });
            }
            catch (Exception ex)
            {
                // 👇 IN LỖI CHI TIẾT RA MÀN HÌNH ĐEN (TERMINAL)
                Console.WriteLine("❌ LỖI DATABASE: " + ex.Message);
                if (ex.InnerException != null)
                {
                    Console.WriteLine("❌ CHI TIẾT GỐC RỄ: " + ex.InnerException.Message);
                }
                return StatusCode(500, "Lỗi máy chủ: " + ex.Message);
            }
        }
        // --- ĐĂNG NHẬP ---
        [HttpPost("login")]
        public async Task<IActionResult> Login(LoginDto request)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == request.Email);
            
            if (user == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            {
                return BadRequest("Email hoặc mật khẩu không đúng.");
            }

            string token = CreateToken(user);
            return Ok(new { token = token, username = user.Username, fullName = user.FullName, email = user.Email });
        }

        // --- LẤY THÔNG TIN (PROFILE) ---
        [HttpGet("profile")]
        [Authorize]
        public async Task<IActionResult> GetProfile()
        {
            var idClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(idClaim)) return Unauthorized();

            int userId = int.Parse(idClaim);

            var user = await _context.Users
                .Where(u => u.Id == userId)
                .Select(u => new { u.Id, u.Username, u.Email, u.FullName, u.CreatedAt })
                .FirstOrDefaultAsync();

            if (user == null) return NotFound("User không tồn tại");

            return Ok(user);
        }

        // --- CẬP NHẬT THÔNG TIN ---
        [HttpPut("update-profile")]
        [Authorize]
        public async Task<IActionResult> UpdateProfile(UpdateProfileDto request)
        {
            var idClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(idClaim)) return Unauthorized();
            int userId = int.Parse(idClaim);

            var user = await _context.Users.FindAsync(userId);
            if (user == null) return NotFound();

            user.FullName = request.FullName;
            
            await _context.SaveChangesAsync();
            return Ok(new { message = "Cập nhật thành công!", fullName = user.FullName });
        }

        // --- ĐỔI MẬT KHẨU ---
        [HttpPost("change-password")]
        [Authorize]
        public async Task<IActionResult> ChangePassword(ChangePasswordDto request)
        {
            var idClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(idClaim)) return Unauthorized();
            int userId = int.Parse(idClaim);

            var user = await _context.Users.FindAsync(userId);
            if (user == null) return NotFound();

            if (!BCrypt.Net.BCrypt.Verify(request.OldPassword, user.PasswordHash))
            {
                return BadRequest("Mật khẩu cũ không đúng.");
            }

            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
            
            await _context.SaveChangesAsync();
            return Ok(new { message = "Đổi mật khẩu thành công!" });
        }

        // Helper: Tạo Token
        private string CreateToken(User user)
        {
            List<Claim> claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Name, user.Username ?? user.Email), // Fallback nếu username null
                new Claim(ClaimTypes.Email, user.Email)
            };

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:Key"] ?? ""));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256Signature);

            var token = new JwtSecurityToken(
                issuer: _config["Jwt:Issuer"],
                audience: _config["Jwt:Audience"],
                claims: claims,
                expires: DateTime.Now.AddDays(7),
                signingCredentials: creds
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }

    // --- DTOs (Data Transfer Objects) ---
    
    public class RegisterDto
    {
        public string? FullName { get; set; } // Thêm trường này để nhận Họ Tên từ React
        public string? Username { get; set; } // Cho phép null (để code tự xử lý)
        public string Email { get; set; }
        public string Password { get; set; }
    }

    public class LoginDto
    {
        public string Email { get; set; }
        public string Password { get; set; }
    }

    public class UpdateProfileDto
    {
        public string FullName { get; set; }
    }

    public class ChangePasswordDto
    {
        public string OldPassword { get; set; }
        public string NewPassword { get; set; }
    }
}