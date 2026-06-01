using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using Projello.Api.DTOs;
using Projello.Api.Models;
using Projello.Api.Data;                    
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using OtpNet; // Required for 2FA
using Microsoft.AspNetCore.Authorization;
using Projello.Api.Enums;
using Microsoft.EntityFrameworkCore;

namespace Projello.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly UserManager<User> _userManager;
        private readonly IConfiguration _config;
        private readonly AppDbContext _context;       

        public AuthController(UserManager<User> userManager, IConfiguration config, AppDbContext context)
        {
            _userManager = userManager;
            _config = config;
            _context = context;                     
        }

        // --- CREATE: REGISTER ---
        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] UserRegisterDto model)
        {
            // If an invite code was provided, validate it and get the company
            Company? company = null;

            if (!string.IsNullOrWhiteSpace(model.InviteCode))
            {
                var invite = await _context.CompanyInvites
                    .Include(i => i.Company)
                    .FirstOrDefaultAsync(i => i.Code == model.InviteCode);

                if (invite == null)
                    return BadRequest(new { Message = "Invalid invite code." });

                if (invite.IsUsed)
                    return BadRequest(new { Message = "This invite code has already been used." });

                if (invite.ExpiresAt < DateTime.UtcNow)
                    return BadRequest(new { Message = "This invite code has expired." });

                company = invite.Company;
            }

            var user = new User
            {
                UserName = model.Email,
                Email = model.Email,
                FullName = model.FullName,
                RoleID = (int)Role.Worker
            };

            // Link user to company if invite code was used
            if (company != null)
            {
                user.CompanyId = company.CompanyID;
            }

            var result = await _userManager.CreateAsync(user, model.Password);

            if (result.Succeeded)
            {
                // Mark invite as used if one was provided
                if (!string.IsNullOrWhiteSpace(model.InviteCode))
                {
                    var invite = await _context.CompanyInvites
                        .FirstOrDefaultAsync(i => i.Code == model.InviteCode);

                    if (invite != null)
                    {
                        invite.IsUsed = true;
                        invite.UsedByUserId = user.Id;
                        invite.UsedAt = DateTime.UtcNow;
                        await _context.SaveChangesAsync();
                    }
                }

                return Ok(new { Message = "User created successfully" });
            }

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
                    return Ok(new
                    {
                        Requires2FA = true,
                        Email = user.Email,
                        Message = "Two-Step Verification required."
                    });
                }

                var token = GenerateJwtToken(user);
                return Ok(new
                {
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
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
                return Unauthorized();

            var user = await _userManager.FindByIdAsync(userId);

            if (user == null)
                return NotFound();

            return Ok(new
            {
                id = user.Id,
                email = user.Email,
                fullName = user.FullName,
                roleId = user.RoleID,
                isTwoFactorEnabled = user.IsTwoFactorEnabled,
                avatarSeed = user.AvatarSeed,           
                avatarBackground = user.AvatarBackground
            });
        }

        // --- UPDATE: CHANGE PASSWORD ---
        [Authorize]
        [HttpPost("change-password")]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordDto model)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId)) return Unauthorized();

            var user = await _userManager.FindByIdAsync(userId);
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
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId)) return Unauthorized();

            var user = await _userManager.FindByIdAsync(userId);
            if (user == null) return NotFound();

            var result = await _userManager.DeleteAsync(user);
            if (result.Succeeded) return Ok(new { Message = "Account deleted." });

            return BadRequest(result.Errors);
        }

        // --- 2FA: STEP 1 - GENERATE TEMPORARY UNVERIFIED SECRET KEY ---
        [Authorize]
        [HttpPost("generate-2fa-secret")]
        public async Task<IActionResult> Generate2FASecret([FromBody] Setup2FaDto model)
        {
            var authenticatedEmail = User.FindFirstValue(ClaimTypes.Email);
            if (string.IsNullOrEmpty(authenticatedEmail) || !authenticatedEmail.Equals(model.Email, StringComparison.OrdinalIgnoreCase))
            {
                return Forbid();
            }

            var user = await _userManager.FindByEmailAsync(model.Email);
            if (user == null) return NotFound();

            if (user.IsTwoFactorEnabled)
            {
                return BadRequest(new { Message = "Two-Factor Authentication is already fully activated on this account profile." });
            }

            // Generate a fresh unique secret configuration key
            var secretKey = KeyGeneration.GenerateRandomKey(20);
            var base32Secret = Base32Encoding.ToString(secretKey);

            // Staging token securely within Identity's unverified token framework
            await _userManager.SetAuthenticationTokenAsync(user, "Projello2FA", "UnverifiedSecretKey", base32Secret);

            var issuer = "Projello";
            var authenticatorUri = $"otpauth://totp/{issuer}:{user.Email}?secret={base32Secret}&issuer={issuer}";

            return Ok(new { SecretKey = base32Secret, AuthenticatorUri = authenticatorUri });
        }

        // --- 2FA: STEP 2 - VERIFY SETUP CHALLENGE AND ACTIVATE CORES ---
        [HttpPost("verify-2fa")]
        public async Task<IActionResult> Verify2FA([FromBody] Verify2FaDto model)
        {
            var user = await _userManager.FindByEmailAsync(model.Email);
            if (user == null) return BadRequest(new { Message = "User not found." });

            string base32Secret;
            bool isInitialSetupWorkflow = !user.IsTwoFactorEnabled;

            if (isInitialSetupWorkflow)
            {
                base32Secret = await _userManager.GetAuthenticationTokenAsync(user, "Projello2FA", "UnverifiedSecretKey") ?? "";
                if (string.IsNullOrEmpty(base32Secret))
                {
                    // Atomic Gate Protection: If another device already verified, this session key is empty!
                    return BadRequest(new { Message = "This QR code setup session has expired or has already been used by another device." });
                }
            }
            else
            {
                base32Secret = user.TwoFactorSecret ?? "";
            }

            if (string.IsNullOrEmpty(base32Secret))
                return BadRequest(new { Message = "2FA is not configured or setup session has expired." });

            var totp = new Totp(Base32Encoding.ToBytes(base32Secret));
            bool isValid = totp.VerifyTotp(model.Code, out long timeStepMatched);

            if (isValid)
            {
                if (isInitialSetupWorkflow)
                {
                    // 1. Promote verified configuration state parameters permanently
                    user.TwoFactorSecret = base32Secret;
                    user.IsTwoFactorEnabled = true;
                    
                    var identityUpdateResult = await _userManager.UpdateAsync(user);
                    if (!identityUpdateResult.Succeeded)
                    {
                        return BadRequest(new { Message = "Failed to commit security parameters to context server footprint." });
                    }

                    // 2. ATOMIC SECURITY ACTION: Flush unverified token space immediately. 
                    // This renders the displayed setup barcode completely useless for any subsequent scanning attempts.
                    await _userManager.RemoveAuthenticationTokenAsync(user, "Projello2FA", "UnverifiedSecretKey");
                }

                var token = GenerateJwtToken(user);
                return Ok(new { Token = token, User = user.FullName });
            }

            return BadRequest(new { Message = "Invalid verification code." });
        }

        // --- 2FA: DISABLE ---
        [Authorize]
        [HttpPost("disable-2fa")]
        public async Task<IActionResult> Disable2FA()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId)) return Unauthorized();

            var user = await _userManager.FindByIdAsync(userId);
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

        // --- COMPANY REGISTRATION ---
        [HttpPost("register-company")]
        public async Task<IActionResult> RegisterCompany([FromBody] UserRegisterDto model)
        {
            if (string.IsNullOrWhiteSpace(model.CompanyName))
            {
                return BadRequest(new { Message = "Company name is required." });
            }

            // 1. Create the Company
            var company = new Company
            {
                Name = model.CompanyName,
                CreatedAt = DateTime.UtcNow
            };

            _context.Companies.Add(company);
            await _context.SaveChangesAsync();

            // 2. Create the User as Owner and link to company
            var user = new User
            {
                UserName = model.Email,
                Email = model.Email,
                FullName = model.FullName,
                RoleID = (int)Role.Owner,
                CompanyId = company.CompanyID
            };

            var result = await _userManager.CreateAsync(user, model.Password);

            if (result.Succeeded)
            {
                // 3. Link company back to owner
                company.OwnerUserId = user.Id;
                await _context.SaveChangesAsync();

                return Ok(new { Message = "Company registered successfully. You are now the Owner." });
            }

            return BadRequest(result.Errors);
        }

        // --- GENERATE INVITE ---
        [Authorize]
        [HttpPost("generate-invite")]
        public async Task<IActionResult> GenerateInviteCode()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
                return Unauthorized();

            var user = await _userManager.FindByIdAsync(userId);
            if (user == null || user.CompanyId == null)
                return BadRequest(new { Message = "You must belong to a company to generate invite codes." });

            // Only Owner or Admin can generate invites
            if (user.RoleID != (int)Role.Owner && user.RoleID != (int)Role.Admin)
                return Forbid();

            // Generate code like: SIGMA-8K3P9X
            string code = Guid.NewGuid().ToString("N").Substring(0, 8).ToUpper();

            var invite = new CompanyInvite
            {
                Code = code,
                CompanyID = user.CompanyId.Value,
                CreatedByUserId = userId,
                CreatedAt = DateTime.UtcNow,
                ExpiresAt = DateTime.UtcNow.AddHours(24),
                IsUsed = false
            };

            _context.CompanyInvites.Add(invite);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                InviteCode = code,
                ExpiresAt = invite.ExpiresAt,
                Message = "Invite code generated successfully. Valid for 24 hours and can only be used once."
            });
        }

        // --- HELPER: JWT GENERATION ---
        private string GenerateJwtToken(User user)
        {
            var claims = new[] {
                new Claim(ClaimTypes.NameIdentifier, user.Id),
                new Claim("FullName", user.FullName ?? ""),
                new Claim("RoleID", user.RoleID.ToString()),
                new Claim(ClaimTypes.Email, user.Email ?? "")
            };

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:Key"]!));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var token = new JwtSecurityToken(
                issuer: _config["Jwt:Issuer"],
                audience: _config["Jwt:Audience"],
                claims: claims,
                expires: DateTime.UtcNow.AddDays(1),
                signingCredentials: creds
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}