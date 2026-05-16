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

        // Predefined list of 5 acceptable emojis based on your ERD & scope specification
        private static readonly HashSet<string> ValidEmojis = new() { "👍", "❤️", "🔥", "👏", "⚠️" };

        public UpdatesController(AppDbContext context)
        {
            _context = context;
        }

       
        // --- CREATE OPERATIONS ---
        

        // --- CREATE: POST DAILY PROGRESS UPDATE ---
        // POST /api/milestones/{id}/updates
        [HttpPost("milestones/{id}/updates")]
        public async Task<ActionResult> PostUpdate(int id, [FromBody] ProgressUpdateCreateDto dto)
        {
            var milestone = await _context.Milestones
                .Include(m => m.Project)
                .ThenInclude(p => p.Client)
                .FirstOrDefaultAsync(m => m.MilestoneID == id);

            if (milestone == null) return NotFound("Milestone not found.");

            // Advanced Business Rule: Prevent updates if the client is blacklisted
            if (milestone.Project?.Client != null && milestone.Project.Client.IsBlacklisted)
            {
                return BadRequest("This operation is restricted because the client associated with this project is blacklisted.");
            }

            var userId = GetCurrentUserId();
            var role = GetUserRole();

            // Advanced Business Rule: Ensure the worker belongs to the project members list
            var isMember = await _context.ProjectMembers
                .AnyAsync(m => m.ProjectID == milestone.ProjectID && m.UserID == userId);
            
            // Authorization logic: Global Admins (Role 1) or Authorized Project Members
            if (role != "1" && !isMember) return Forbid();

            var update = new ProgressUpdate
            {
                MilestoneID = id,
                UserID = userId!,
                OptionalComment = dto.OptionalComment,
                UpdateDate = DateOnly.FromDateTime(DateTime.UtcNow), // Explicit DateOnly representation 
                CreatedAt = DateTime.UtcNow
            };

            _context.ProgressUpdates.Add(update);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetUpdateById), new { id = update.UpdateID }, new { Message = "Update posted successfully", UpdateID = update.UpdateID });
        }

        // --- CREATE: ADD REACTION TO AN UPDATE ---
        // POST /api/updates/{id}/reactions
        [HttpPost("updates/{id}/reactions")]
        public async Task<ActionResult> AddReaction(int id, [FromBody] ReactionCreateDto dto)
        {
            var update = await _context.ProgressUpdates
                .Include(u => u.Milestone)
                .FirstOrDefaultAsync(u => u.UpdateID == id);

            if (update == null) return NotFound("Update not found.");

            // Real-Time Validation: Restrict to the 5 predefined emojis from project constraints
            if (!ValidEmojis.Contains(dto.Emoji))
            {
                return BadRequest("Invalid emoji reaction. You may only react with: 👍, ❤️, 🔥, 👏, or ⚠️.");
            }

            var userId = GetCurrentUserId();
            var role = GetUserRole();

            // Advanced Business Rule: Users can only react to updates for projects they belong to
            var isMember = await _context.ProjectMembers
                .AnyAsync(m => m.ProjectID == update.Milestone.ProjectID && m.UserID == userId);

            if (role != "1" && !isMember) return Forbid();

            // Optional enhancement: Prevent duplicated identical reactions from the same user
            var existingReaction = await _context.Reactions
                .AnyAsync(r => r.UpdateID == id && r.UserID == userId && r.Emoji == dto.Emoji);
            if (existingReaction) return BadRequest("You have already reacted to this update with this emoji.");

            var reaction = new Reaction
            {
                UpdateID = id,
                UserID = userId!,
                Emoji = dto.Emoji,
                CreatedAt = DateTime.UtcNow
            };

            _context.Reactions.Add(reaction);
            await _context.SaveChangesAsync();

            return Ok(new { Message = "Reaction added successfully" });
        }

        
        // --- READ OPERATIONS ---
        

        // --- READ: DASHBOARD ACTIVITY FEED ---
        // GET /api/updates
        [HttpGet("updates")]
        public async Task<ActionResult<IEnumerable<UpdateReadDto>>> GetRecentActivity()
        {
            var userId = GetCurrentUserId();
            var role = GetUserRole();

            // Base query designed for low latency aggregation payloads mapping directly to the UI Dashboard
            var query = _context.ProgressUpdates
                .Include(u => u.User)
                .Include(u => u.Milestone)
                    .ThenInclude(m => m.Project)
                .Include(u => u.Reactions)
                    .ThenInclude(r => r.User)
                .AsQueryable();

            // Role filtering context: Contextual authorization boundary
            if (role != "1")
            {
                query = query.Where(u => _context.ProjectMembers
                    .Any(pm => pm.ProjectID == u.Milestone.ProjectID && pm.UserID == userId));
            }

            // High performance transform directly mapped to UI views
            var updates = await query
                .OrderByDescending(u => u.CreatedAt)
                .Take(20)
                .Select(u => MapToReadDto(u))
                .ToListAsync();

            return Ok(updates);
        }

        // --- READ: GET SINGLE UPDATE BY ID ---
        // GET /api/updates/{id}
        [HttpGet("updates/{id}")]
        public async Task<ActionResult<UpdateReadDto>> GetUpdateById(int id)
        {
            var update = await _context.ProgressUpdates
                .Include(u => u.User)
                .Include(u => u.Milestone)
                    .ThenInclude(m => m.Project)
                .Include(u => u.Reactions)
                    .ThenInclude(r => r.User)
                .FirstOrDefaultAsync(u => u.UpdateID == id);

            if (update == null) return NotFound("Progress update not found.");

            var userId = GetCurrentUserId();
            var role = GetUserRole();

            // Check if user has membership/access to the parent project
            var isMember = await _context.ProjectMembers
                .AnyAsync(m => m.ProjectID == update.Milestone.ProjectID && m.UserID == userId);

            if (role != "1" && !isMember) return Forbid();

            return Ok(MapToReadDto(update));
        }

        
        // --- UPDATE OPERATIONS ---
        

        // --- UPDATE: EDIT OPTIONAL COMMENT ---
        // PUT /api/updates/{id}
        [HttpPut("updates/{id}")]
        public async Task<IActionResult> UpdateProgressComment(int id, [FromBody] ProgressUpdateCreateDto dto)
        {
            var update = await _context.ProgressUpdates
                .Include(u => u.Milestone)
                .ThenInclude(m => m.Project)
                .ThenInclude(p => p.Client)
                .FirstOrDefaultAsync(u => u.UpdateID == id);

            if (update == null) return NotFound("Progress update not found.");

            // Enforce Blacklist Rules on updates/modifications
            if (update.Milestone.Project?.Client != null && update.Milestone.Project.Client.IsBlacklisted)
            {
                return BadRequest("Modifications are blocked because the project's client is blacklisted.");
            }

            var userId = GetCurrentUserId();
            var role = GetUserRole();

            // Authorization: Only the creator of the progress report or a Global Admin can edit it
            if (role != "1" && update.UserID != userId)
            {
                return Forbid("You can only modify progress updates that you created.");
            }

            update.OptionalComment = dto.OptionalComment;
            // Retain original UpdateDate and CreatedAt logs for verification integrity

            _context.ProgressUpdates.Update(update);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        
        // --- DELETE OPERATIONS ---
       

        // --- DELETE: REMOVE A PROGRESS UPDATE ---
        // DELETE /api/updates/{id}
        [HttpDelete("updates/{id}")]
        public async Task<IActionResult> DeleteProgressUpdate(int id)
        {
            var update = await _context.ProgressUpdates
                .Include(u => u.Milestone)
                .FirstOrDefaultAsync(u => u.UpdateID == id);

            if (update == null) return NotFound("Progress update not found.");

            var userId = GetCurrentUserId();
            var role = GetUserRole();

            // Authorization logic: Admins can remove anything. Foremen can remove updates within their project. 
            // Workers can delete their own updates.
            bool isCreator = update.UserID == userId;
            bool isProjectForeman = await _context.ProjectMembers.AnyAsync(m => 
                m.ProjectID == update.Milestone.ProjectID && 
                m.UserID == userId && 
                m.AssignedAs == "Foreman");

            if (role != "1" && !isCreator && !isProjectForeman)
            {
                return Forbid("You do not have permission to delete this progress update.");
            }

            // Cascade delete child components (Reactions) linked via database architecture
            var linkedReactions = _context.Reactions.Where(r => r.UpdateID == id);
            _context.Reactions.RemoveRange(linkedReactions);

            _context.ProgressUpdates.Remove(update);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        // --- DELETE: REMOVE AN EMOJI REACTION ---
        // DELETE /api/updates/{id}/reactions
        [HttpDelete("updates/{id}/reactions")]
        public async Task<IActionResult> RemoveReaction(int id, [FromBody] ReactionCreateDto dto)
        {
            var userId = GetCurrentUserId();

            var reaction = await _context.Reactions.FirstOrDefaultAsync(r => 
                r.UpdateID == id && 
                r.UserID == userId && 
                r.Emoji == dto.Emoji);

            if (reaction == null) return NotFound("Reaction not found or you did not create it.");

            _context.Reactions.Remove(reaction);
            await _context.SaveChangesAsync();

            return NoContent();
        }

       
        // --- PRIVATE HELPERS ---
        
        
        private string? GetCurrentUserId()
        {
            return User.FindFirstValue(ClaimTypes.NameIdentifier);
        }

        private string? GetUserRole()
        {
            return User.FindFirst("RoleID")?.Value;
        }

        private static UpdateReadDto MapToReadDto(ProgressUpdate u)
        {
            return new UpdateReadDto
            {
                UpdateID = u.UpdateID,
                UserFullName = u.User != null ? u.User.FullName : "Unknown User",
                MilestoneTitle = u.Milestone != null ? u.Milestone.Title : "N/A",
                ProjectName = u.Milestone != null && u.Milestone.Project != null ? u.Milestone.Project.Name : "N/A",
                Comment = u.OptionalComment,
                UpdateDate = u.UpdateDate,
                Reactions = u.Reactions != null 
                    ? u.Reactions.Select(r => new ReactionReadDto
                      {
                          Emoji = r.Emoji,
                          UserFullName = r.User != null ? r.User.FullName : "Anonymous"
                      }).ToList()
                    : new List<ReactionReadDto>()
            };
        }
    }
}