using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using Projello.Api.DTOs;
using Projello.Api.Models;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using OtpNet; // Required for 2FA
using Microsoft.AspNetCore.Authorization;

namespace Projello.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly UserManager<User> _userManager;
        private readonly IConfiguration _config;

        public AuthController(UserManager<User> userManager, IConfiguration config)
        {
            _userManager = userManager;
            _config = config;
        }

        // --- CREATE: REGISTER ---
        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] UserRegisterDto model)
        {
            var user = new User {
                UserName = model.Email,
                Email = model.Email,
                FullName = model.FullName,
                RoleID = model.RoleID // Maps to your ERD Role system
            };

            var result = await _userManager.CreateAsync(user, model.Password);

            if (result.Succeeded) return Ok(new { Message = "User created successfully" });
            return BadRequest(result.Errors);
        }

        // --- READ: LOGIN ---
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] UserLoginDto model)
        {
            var user = await _userManager.FindByEmailAsync(model.Email);
            if (user != null && await _userManager.CheckPasswordAsync(user, model.Password))
            {
                if (user.IsTwoFactorEnabled)
                {
                    return Ok(new { 
                        Requires2FA = true, 
                        Email = user.Email,
                        Message = "Two-Step Verification required."
                    });
                }

                var token = GenerateJwtToken(user);
                return Ok(new { 
                    Token = token, 
                    User = user.FullName, 
                    Requires2FA = false 
                });
            }
            return Unauthorized(new { Message = "Invalid credentials" });
        }

        // --- READ: GET CURRENT USER (ME) ---
        [Authorize]
        [HttpGet("me")]
        public async Task<IActionResult> GetCurrentUser()
        {
            var email = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var user = await _userManager.FindByEmailAsync(email!);

            if (user == null) return NotFound();

            return Ok(new {
                user.Id,
                user.Email,
                user.FullName,
                user.RoleID,
                user.IsTwoFactorEnabled
            });
        }

        // --- UPDATE: CHANGE PASSWORD ---
        [Authorize]
        [HttpPost("change-password")]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordDto model)
        {
            var email = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var user = await _userManager.FindByEmailAsync(email!);

            if (user == null) return NotFound();

            var result = await _userManager.ChangePasswordAsync(user, model.CurrentPassword, model.NewPassword);
            if (result.Succeeded) return Ok(new { Message = "Password updated successfully." });

            return BadRequest(result.Errors);
        }

        // --- DELETE: REMOVE ACCOUNT ---
        [Authorize]
        [HttpDelete("delete-account")]
        public async Task<IActionResult> DeleteAccount()
        {
            var email = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var user = await _userManager.FindByEmailAsync(email!);

            if (user == null) return NotFound();

            var result = await _userManager.DeleteAsync(user);
            if (result.Succeeded) return Ok(new { Message = "Account deleted." });

            return BadRequest(result.Errors);
        }

        // --- 2FA: VERIFICATION ---
        [HttpPost("verify-2fa")]
        public async Task<IActionResult> Verify2FA([FromBody] Verify2FaDto model)
        {
            var user = await _userManager.FindByEmailAsync(model.Email);
            if (user == null) return BadRequest(new { Message = "User not found." });

            if (string.IsNullOrEmpty(user.TwoFactorSecret))
                return BadRequest(new { Message = "2FA is not configured." });

            var totp = new Totp(Base32Encoding.ToBytes(user.TwoFactorSecret));
            bool isValid = totp.VerifyTotp(model.Code, out long timeStepMatched);

            if (isValid)
            {
                // --- NEW PRODUCTION LOGIC ---
                // If they are verifying for the first time during setup, officially enable it!
                if (!user.IsTwoFactorEnabled)
                {
                    user.IsTwoFactorEnabled = true;
                    await _userManager.UpdateAsync(user);
                }

                var token = GenerateJwtToken(user);
                return Ok(new { Token = token, User = user.FullName });
            }

            return BadRequest(new { Message = "Invalid verification code." });
        }

        // --- 2FA: SETUP ---
        [HttpPost("generate-2fa-secret")]
        public async Task<IActionResult> Generate2FASecret([FromBody] Setup2FaDto model)
        {
            var user = await _userManager.FindByEmailAsync(model.Email);
            if (user == null) return NotFound();

            var secretKey = KeyGeneration.GenerateRandomKey(20);
            var base32Secret = Base32Encoding.ToString(secretKey);

            // Save the secret, but DO NOT enable 2FA yet!
            user.TwoFactorSecret = base32Secret;
            
            await _userManager.UpdateAsync(user);

            var issuer = "Projello";
            var authenticatorUri = $"otpauth://totp/{issuer}:{user.Email}?secret={base32Secret}&issuer={issuer}";

            return Ok(new { SecretKey = base32Secret, AuthenticatorUri = authenticatorUri });
        }

        // --- 2FA: DISABLE ---
        [Authorize]
        [HttpPost("disable-2fa")]
        public async Task<IActionResult> Disable2FA()
        {
            var email = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var user = await _userManager.FindByEmailAsync(email!);

            if (user == null) return NotFound();

            user.IsTwoFactorEnabled = false;
            user.TwoFactorSecret = null;
            await _userManager.UpdateAsync(user);

            return Ok(new { Message = "2FA has been disabled." });
        }

        // --- 2FA: STATUS ---
        [HttpGet("2fa-status")]
        public async Task<IActionResult> Get2FAStatus([FromQuery] string email)
        {
            var user = await _userManager.FindByEmailAsync(email);
            if (user == null) return NotFound();

            return Ok(new { is2FAEnabled = user.IsTwoFactorEnabled });
        }

        // --- HELPER: JWT GENERATION ---
        private string GenerateJwtToken(User user)
        {
            var claims = new[] {
                new Claim(ClaimTypes.NameIdentifier, user.Email!), // Used for [Authorize] lookup
                new Claim("FullName", user.FullName ?? ""),
                new Claim("RoleID", user.RoleID.ToString())
            };

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:Key"]!));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var token = new JwtSecurityToken(
                issuer: _config["Jwt:Issuer"],
                audience: _config["Jwt:Audience"],
                claims: claims,
                expires: DateTime.Now.AddDays(1),
                signingCredentials: creds
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}