using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Projello.Api.DTOs;
using Projello.Api.Models;
using System.Security.Claims;

namespace Projello.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize] // All endpoints require a valid JWT
    public class UsersController : ControllerBase
    {
        private readonly UserManager<User> _userManager;

        public UsersController(UserManager<User> userManager)
        {
            _userManager = userManager;
        }

        // --- READ: GET ALL USERS ---
        // Restricted to Admin (RoleID 1)
        [HttpGet]
        public async Task<ActionResult<IEnumerable<UserDisplayDto>>> GetUsers()
        {
            if (!IsAdmin()) return Forbid();

            var users = await _userManager.Users
                .Select(u => new UserDisplayDto
                {
                    Id = u.Id,
                    FullName = u.FullName,
                    Email = u.Email!,
                    RoleID = u.RoleID,
                    IsTwoFactorEnabled = u.IsTwoFactorEnabled
                })
                .ToListAsync();

            return Ok(users);
        }

        // --- READ: GET SINGLE USER ---
        [HttpGet("{id}")]
        public async Task<ActionResult<UserDisplayDto>> GetUser(string id)
        {
            // Users can view their own profile, or Admins can view anyone
            if (!IsAdmin() && GetCurrentUserId() != id) return Forbid();

            var user = await _userManager.FindByIdAsync(id);
            if (user == null) return NotFound();

            return Ok(new UserDisplayDto
            {
                Id = user.Id,
                FullName = user.FullName,
                Email = user.Email!,
                RoleID = user.RoleID,
                IsTwoFactorEnabled = user.IsTwoFactorEnabled
            });
        }

        // --- UPDATE: GENERAL PROFILE INFO ---
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateUser(string id, [FromBody] UserUpdateDto model)
        {
            if (!IsAdmin() && GetCurrentUserId() != id) return Forbid();

            var user = await _userManager.FindByIdAsync(id);
            if (user == null) return NotFound();

            user.FullName = model.FullName;
            user.Email = model.Email;
            user.UserName = model.Email; // Keep Identity username in sync

            var result = await _userManager.UpdateAsync(user);
            if (result.Succeeded) return NoContent();

            return BadRequest(result.Errors);
        }

        // --- UPDATE: ROLE (ADMIN ONLY) ---
        [HttpPut("{id}/role")]
        public async Task<IActionResult> UpdateUserRole(string id, [FromBody] UserRoleUpdateDto model)
        {
            if (!IsAdmin()) return Forbid();

            var user = await _userManager.FindByIdAsync(id);
            if (user == null) return NotFound();

            // Logic check: Prevent the current user from demoting themselves 
            // if they are the only Admin left (optional but recommended)
            if (GetCurrentUserId() == id && model.RoleID != 1)
            {
                return BadRequest(new { Message = "You cannot change your own admin role." });
            }

            user.RoleID = model.RoleID;

            var result = await _userManager.UpdateAsync(user);
            if (result.Succeeded) return Ok(new { Message = "User role updated successfully." });

            return BadRequest(result.Errors);
        }

        // --- DELETE: USER (ADMIN ONLY) ---
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteUser(string id)
        {
            if (!IsAdmin()) return Forbid();

            var user = await _userManager.FindByIdAsync(id);
            if (user == null) return NotFound();

            // Prevent self-deletion
            if (GetCurrentUserId() == id) 
                return BadRequest(new { Message = "You cannot delete your own account from the Admin panel." });

            var result = await _userManager.DeleteAsync(user);
            if (result.Succeeded) return Ok(new { Message = "User has been removed from Projello." });

            return BadRequest(result.Errors);
        }

        // --- PRIVATE HELPERS ---
        
        private bool IsAdmin()
        {
            // Checks the "RoleID" claim we injected during login in AuthController
            var roleClaim = User.FindFirst("RoleID")?.Value;
            return roleClaim == "1"; // Assuming 1 = Admin, 2 = Foreman, 3 = Worker
        }

        private string? GetCurrentUserId()
        {
            // Retrieves the unique ID of the user making the request
            return User.FindFirstValue(ClaimTypes.NameIdentifier);
        }
    }
}