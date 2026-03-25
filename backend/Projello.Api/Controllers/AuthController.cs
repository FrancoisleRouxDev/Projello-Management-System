using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using Projello.Api.DTOs;
using Projello.Api.Models;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

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

    [HttpPost("register")]// API endpoint: POST /api/Auth/register
    public async Task<IActionResult> Register([FromBody] UserRegisterDto model)
    {
        // Check if email already exists
        if (await _userManager.FindByEmailAsync(model.Email) != null)
        {
            return BadRequest(new { Message = "Email is already registered." });
        }

        var user = new User { 
            UserName = model.Email,  // Sets username to email for Identity
            Email = model.Email, 
            FullName = model.FullName,
            RoleID = model.RoleID 
        };
        
        var result = await _userManager.CreateAsync(user, model.Password);// Hashes password, saves to DB

        if (result.Succeeded)
        {
            // Return safe response using UserReadDto (NO password!)
            var responseDto = new UserReadDto
            {
                Id = user.Id,
                FullName = user.FullName,
                Email = user.Email,
                Role = "User",                    //don't care about role names for now
                CreatedAt = user.CreatedAt
            };

            return Ok(new 
            { 
                Message = "User registered successfully",
                User = responseDto 
            });
        }

        return BadRequest(result.Errors);
    }

    [HttpPost("login")] // API endpoint: POST /api/Auth/login
    public async Task<IActionResult> Login([FromBody] UserLoginDto model)   //Fixed: Added IActionResult
    {
        var user = await _userManager.FindByEmailAsync(model.Email);

        if (user == null || !await _userManager.CheckPasswordAsync(user, model.Password)) 
        { 
            return Unauthorized(new { Message = "Invalid email or password" }); 
        }

        var token = GenerateJwtToken(user);

        // Safe response DTO - no password sent 
        var userDto = new UserReadDto 
        { 
            Id = user.Id, 
            FullName = user.FullName, 
            Email = user.Email, 
            Role = "User", 
            CreatedAt = user.CreatedAt 
        };

        return Ok(new { Token = token, User = userDto }); 
    }

private string GenerateJwtToken(User user)
{
    var claims = new[]
    {
        new Claim(JwtRegisteredClaimNames.Sub, user.Id),           // Subject - usually the unique user ID
        new Claim(JwtRegisteredClaimNames.Email, user.Email!),     // Email claim so we can identify the user
        new Claim("FullName", user.FullName),                      // Custom claim: stores user's full name
        new Claim("RoleID", user.RoleID.ToString())                // Custom claim: stores the RoleID (1,2,3...)
    };

    var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:Key"]!)); // Secret key from appsettings.json
    var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);         // Signing credentials using HMAC-SHA256

    var token = new JwtSecurityToken(
        issuer: _config["Jwt:Issuer"],                    // Who created this token (your API)
        audience: _config["Jwt:Audience"],                // Who is allowed to receive/use this token
        claims: claims,                                   // All the user data we want inside the token
        expires: DateTime.UtcNow.AddHours(24),            // Token expires after 24 hours
        signingCredentials: creds                         // The key + algorithm used to sign the token
    );

    return new JwtSecurityTokenHandler().WriteToken(token); // Convert token object to string
}
}