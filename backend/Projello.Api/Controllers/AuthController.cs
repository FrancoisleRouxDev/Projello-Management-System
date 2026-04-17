using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using Projello.Api.DTOs;
using Projello.Api.Models;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using OtpNet; // Required for 2FA

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

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] UserRegisterDto model)
        {
            var user = new User { 
                UserName = model.Email, // Using Email as UserName is standard practice for Identity
                Email = model.Email, 
                FullName = model.FullName,
                RoleID = model.RoleID 
            };
            
            var result = await _userManager.CreateAsync(user, model.Password);

            if (result.Succeeded) return Ok(new { Message = "User created successfully" });
            return BadRequest(result.Errors);
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] UserLoginDto model)
        {
            var user = await _userManager.FindByEmailAsync(model.Email);
            if (user != null && await _userManager.CheckPasswordAsync(user, model.Password))
            {
                // --- 2FA LOGIC ---
                // If the user has 2FA enabled, stop here. Do NOT issue the JWT yet.
                if (user.IsTwoFactorEnabled)
                {
                    return Ok(new { 
                        Requires2FA = true, 
                        Email = user.Email,
                        Message = "Two-Step Verification required."
                    });
                }

                // If 2FA is not enabled, proceed to issue the JWT normally.
                var token = GenerateJwtToken(user);
                return Ok(new { 
                    Token = token, 
                    User = user.FullName, 
                    Requires2FA = false 
                });
            }
            return Unauthorized(new { Message = "Invalid credentials" });
        }

        // --- VERIFICATION ENDPOINT ---
        [HttpPost("verify-2fa")]
        public async Task<IActionResult> Verify2FA([FromBody] Verify2FaDto model)
        {
            var user = await _userManager.FindByEmailAsync(model.Email);
            if (user == null) return BadRequest(new { Message = "User not found." });

            if (string.IsNullOrEmpty(user.TwoFactorSecret))
                return BadRequest(new { Message = "2FA is not configured for this user." });

            // Validate the 6-digit code against the user's secret
            var totp = new Totp(Base32Encoding.ToBytes(user.TwoFactorSecret));
            bool isValid = totp.VerifyTotp(model.Code, out long timeStepMatched);

            if (isValid)
            {
                // Code is correct! Issue the real JWT token now.
                var token = GenerateJwtToken(user);
                return Ok(new { Token = token, User = user.FullName });
            }

            return BadRequest(new { Message = "Invalid verification code." });
        }

        // --- NEW: SETUP 2FA ENDPOINT ---
        [HttpPost("generate-2fa-secret")]
        public async Task<IActionResult> Generate2FASecret([FromBody] Setup2FaDto model)
        {
            var user = await _userManager.FindByEmailAsync(model.Email);
            if (user == null) return NotFound(new { Message = "User not found." });

            // 1. Generate a secure Base32 secret key
            var secretKey = KeyGeneration.GenerateRandomKey(20);
            var base32Secret = Base32Encoding.ToString(secretKey);

            // 2. Save the secret to the user's record
            user.TwoFactorSecret = base32Secret;
            
            // Note: We turn it on here. In a production app, you might wait to set this 
            // to true until they successfully verify the first code, but this works perfectly for your MVP!
            user.IsTwoFactorEnabled = true; 
            
            await _userManager.UpdateAsync(user);

            // 3. Create the URI that the React QR Code component needs
            var issuer = "Projello";
            var accountName = user.Email;
            var authenticatorUri = $"otpauth://totp/{issuer}:{accountName}?secret={base32Secret}&issuer={issuer}";

            // 4. Send it back to the React frontend
            return Ok(new 
            { 
                SecretKey = base32Secret, 
                AuthenticatorUri = authenticatorUri 
            });
        }

        private string GenerateJwtToken(User user)
        {
            var claims = new[] {
                new Claim(JwtRegisteredClaimNames.Sub, user.Email!),
                new Claim("FullName", user.FullName),
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