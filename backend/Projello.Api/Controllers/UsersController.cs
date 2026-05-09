using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Projello.Api.Data;
using Projello.Api.DTOs;
using Projello.Api.Models;
using System.Security.Claims;

namespace Projello.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class UsersController : ControllerBase
    {
        private readonly UserManager<User> _userManager;
        private readonly AppDbContext _context;

        public UsersController(UserManager<User> userManager, AppDbContext context)
        {
            _userManager = userManager;
            _context = context;
        }

        // --- READ: LIST ALL USERS (Searchable) ---
        // Access: Admin (1) and Foreman (2)
        [HttpGet]
        public async Task<ActionResult<IEnumerable<UserDisplayDto>>> GetUsers([FromQuery] string? search)
        {
            var role = GetUserRole();
            if (role != "1" && role != "2") return Forbid();

            var query = _userManager.Users.AsQueryable();

            if (!string.IsNullOrWhiteSpace(search))
            {
                query = query.Where(u => u.FullName.Contains(search) || u.Email!.Contains(search));
            }

            var users = await query
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

        // --- READ: FULL DASHBOARD PROFILE ---
        // Access: Self or Admin
        [HttpGet("{id}/full")]
        public async Task<ActionResult<UserProfileDto>> GetFullProfile(string id)
        {
            if (!IsAdmin() && GetCurrentUserId() != id) return Forbid();

            var user = await _userManager.FindByIdAsync(id);
            if (user == null) return NotFound();

            var projects = await _context.ProjectMembers
                .Where(pm => pm.UserID == id)
                .Select(pm => new UserProjectDto {
                    ProjectID = pm.ProjectID,
                    Name = pm.Project.Name,
                    RoleInProject = pm.AssignedAs
                }).ToListAsync();

            var tasks = await _context.Tasks
                .Where(t => t.AssignedToUserID == id)
                .Select(t => new UserTaskDto {
                    TaskID = t.TaskID,
                    Title = t.Title,
                    Status = t.Status.ToString(),
                    DueDate = t.DueDate
                }).ToListAsync();

            return Ok(new UserProfileDto {
                Id = user.Id,
                FullName = user.FullName,
                Email = user.Email!,
                RoleID = user.RoleID,
                Projects = projects,
                AssignedTasks = tasks
            });
        }

        // --- READ: WORKLOAD STATISTICS ---
        // Access: Self, Foreman, or Admin
        [HttpGet("{id}/workload")]
        public async Task<ActionResult<UserWorkloadDto>> GetUserWorkload(string id)
        {
            var role = GetUserRole();
            if (role != "1" && role != "2" && GetCurrentUserId() != id) return Forbid();

            var stats = new UserWorkloadDto
            {
                OpenTasks = await _context.Tasks.CountAsync(t => t.AssignedToUserID == id && t.Status != Status.Completed),
                CompletedTasks = await _context.Tasks.CountAsync(t => t.AssignedToUserID == id && t.Status == Status.Completed),
                BlockedTasks = await _context.Tasks.CountAsync(t => t.AssignedToUserID == id && t.Status == Status.Blocked)
            };

            return Ok(stats);
        }

        // --- UPDATE: PROFILE SETTINGS ---
        // Access: Self or Admin
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateUser(string id, [FromBody] UserUpdateDto model)
        {
            if (!IsAdmin() && GetCurrentUserId() != id) return Forbid();

            var user = await _userManager.FindByIdAsync(id);
            if (user == null) return NotFound();

            user.FullName = model.FullName;
            user.Email = model.Email;
            user.UserName = model.Email;

            var result = await _userManager.UpdateAsync(user);
            return result.Succeeded ? NoContent() : BadRequest(result.Errors);
        }

        // --- UPDATE: CHANGE PASSWORD ---
        // Access: Self Only
        [HttpPost("{id}/change-password")]
        public async Task<IActionResult> ChangePassword(string id, [FromBody] UpdatePasswordDto model)
        {
            if (GetCurrentUserId() != id) return Forbid();

            var user = await _userManager.FindByIdAsync(id);
            if (user == null) return NotFound();

            var result = await _userManager.ChangePasswordAsync(user, model.CurrentPassword, model.NewPassword);
            return result.Succeeded ? Ok(new { Message = "Password updated." }) : BadRequest(result.Errors);
        }

        // --- UPDATE: CHANGE ROLE (Admin Only) ---
        [HttpPut("{id}/role")]
        public async Task<IActionResult> UpdateUserRole(string id, [FromBody] UserRoleUpdateDto model)
        {
            if (!IsAdmin()) return Forbid();

            var user = await _userManager.FindByIdAsync(id);
            if (user == null) return NotFound();

            if (GetCurrentUserId() == id && model.RoleID != 1)
                return BadRequest("You cannot demote yourself from Admin.");

            user.RoleID = model.RoleID;
            await _userManager.UpdateAsync(user);
            return Ok(new { Message = "User role changed." });
        }

        // --- DELETE: ACCOUNT (Admin Only) ---
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteUser(string id)
        {
            if (!IsAdmin()) return Forbid();

            var user = await _userManager.FindByIdAsync(id);
            if (user == null) return NotFound();

            if (GetCurrentUserId() == id) return BadRequest("Self-deletion is blocked.");

            var hasTasks = await _context.Tasks.AnyAsync(t => t.AssignedToUserID == id);
            if (hasTasks) return BadRequest("Reassign this user's tasks before deleting them.");

            await _userManager.DeleteAsync(user);
            return Ok();
        }

        // --- HELPERS ---
        private bool IsAdmin() => GetUserRole() == "1";
        private string? GetUserRole() => User.FindFirst("RoleID")?.Value;
        private string? GetCurrentUserId() => User.FindFirstValue(ClaimTypes.NameIdentifier);
    }
}