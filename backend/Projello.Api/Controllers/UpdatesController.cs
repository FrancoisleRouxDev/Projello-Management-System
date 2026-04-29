using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Projello.Api.Data;
using Projello.Api.Models;
using Projello.Api.DTOs;
using System.Security.Claims;

namespace Projello.Api.Controllers
{
    [Route("api")]
    [ApiController]
    [Authorize] // Requires a valid JWT to access any endpoint here
    public class UpdatesController : ControllerBase
    {
        private readonly AppDbContext _context;

        public UpdatesController(AppDbContext context)
        {
            _context = context;
        }

        // --- CREATE: POST DAILY PROGRESS UPDATE ---
        // POST /api/milestones/{id}/updates
        [HttpPost("milestones/{id}/updates")]
        public async Task<ActionResult> PostUpdate(int id, [FromBody] ProgressUpdateCreateDto dto)
        {
            var milestone = await _context.Milestones.FindAsync(id);
            if (milestone == null) return NotFound("Milestone not found.");

            var userId = GetCurrentUserId();
            var role = GetUserRole();

            // Security: Ensure the worker is assigned to the project this milestone belongs to
            var isMember = await _context.ProjectMembers
                .AnyAsync(m => m.ProjectID == milestone.ProjectID && m.UserID == userId);
            
            // Allow Admins (Role 1) or Project Members
            if (role != "1" && !isMember) return Forbid();

            var update = new ProgressUpdate
            {
                MilestoneID = id,
                UserID = userId!,
                OptionalComment = dto.OptionalComment,
                UpdateDate = DateOnly.FromDateTime(DateTime.UtcNow), // Correctly formats to DateOnly
                CreatedAt = DateTime.UtcNow
            };

            _context.ProgressUpdates.Add(update);
            await _context.SaveChangesAsync();

            return Ok(new { Message = "Update posted successfully", UpdateID = update.UpdateID });
        }

        // --- CREATE: ADD REACTION TO AN UPDATE ---
        // POST /api/updates/{id}/reactions
        [HttpPost("updates/{id}/reactions")]
        public async Task<ActionResult> AddReaction(int id, [FromBody] ReactionCreateDto dto)
        {
            var updateExists = await _context.ProgressUpdates.AnyAsync(u => u.UpdateID == id);
            if (!updateExists) return NotFound("Update not found.");

            var reaction = new Reaction
            {
                UpdateID = id,
                UserID = GetCurrentUserId()!,
                Emoji = dto.Emoji,
                CreatedAt = DateTime.UtcNow
            };

            _context.Reactions.Add(reaction);
            await _context.SaveChangesAsync();

            return Ok();
        }

        // --- READ: DASHBOARD ACTIVITY FEED ---
        // GET /api/updates
        [HttpGet("updates")]
        public async Task<ActionResult<IEnumerable<UpdateReadDto>>> GetRecentActivity()
        {
            var userId = GetCurrentUserId();
            var role = GetUserRole();

            // Base query fetching all related data needed for the DTO
            var query = _context.ProgressUpdates
                .Include(u => u.User)
                .Include(u => u.Milestone)
                    .ThenInclude(m => m.Project)
                .Include(u => u.Reactions)
                    .ThenInclude(r => r.User)
                .AsQueryable();

            // Role filtering: Non-admins (Roles 2 & 3) only see updates for projects they belong to
            if (role != "1")
            {
                query = query.Where(u => _context.ProjectMembers
                    .Any(pm => pm.ProjectID == u.Milestone.ProjectID && pm.UserID == userId));
            }

            // Map exactly to the UpdateReadDto and ReactionReadDto
            var updates = await query
                .OrderByDescending(u => u.CreatedAt)
                .Take(20)
                .Select(u => new UpdateReadDto
                {
                    UpdateID = u.UpdateID,
                    UserFullName = u.User.FullName,
                    MilestoneTitle = u.Milestone.Title,
                    ProjectName = u.Milestone.Project.Name,
                    Comment = u.OptionalComment,
                    UpdateDate = u.UpdateDate,
                    Reactions = u.Reactions.Select(r => new ReactionReadDto
                    {
                        Emoji = r.Emoji,
                        UserFullName = r.User.FullName
                    }).ToList()
                })
                .ToListAsync();

            return Ok(updates);
        }

        // --- PRIVATE HELPERS ---
        // These MUST remain inside the UpdatesController class brackets
        
        private string? GetCurrentUserId()
        {
            return User.FindFirstValue(ClaimTypes.NameIdentifier);
        }

        private string? GetUserRole()
        {
            return User.FindFirst("RoleID")?.Value;
        }
    }
}