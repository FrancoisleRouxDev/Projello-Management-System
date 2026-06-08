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
    [Authorize]
    public class MilestonesController : ControllerBase
    {
        private readonly AppDbContext _context;

        public MilestonesController(AppDbContext context)
        {
            _context = context;
        }

        // --- READ: GET MILESTONES FOR A PROJECT ---
        // GET /api/projects/{projectId}/milestones
        [HttpGet("projects/{projectId}/milestones")]
        public async Task<ActionResult<IEnumerable<MilestoneReadDto>>> GetProjectMilestones(int projectId)
        {
            var userId = GetCurrentUserId();
            var role = GetUserRole();

            // Check if project exists
            var projectExists = await _context.Projects.AnyAsync(p => p.ProjectID == projectId);
            if (!projectExists) return NotFound("Project not found.");

            // Security: Must be Admin OR assigned to the project
            bool isMember = await _context.ProjectMembers
                .AnyAsync(m => m.ProjectID == projectId && m.UserID == userId);

            if (role != "1" && !isMember) return Forbid();

            var milestones = await _context.Milestones
                .Where(m => m.ProjectID == projectId)
                .OrderBy(m => m.DueDate)
                .Select(m => new MilestoneReadDto
                {
                    MilestoneID = m.MilestoneID,
                    ProjectID = m.ProjectID,
                    Title = m.Title,
                    Description = m.Description,
                    DueDate = m.DueDate,
                    Status = m.Status,
                    CompletedDate = m.CompletedDate,
                    CreatedAt = m.CreatedAt,
                    Progress = m.Progress
                })
                .ToListAsync();

            return Ok(milestones);
        }

        // --- CREATE: NEW MILESTONE ---
        // POST /api/milestones
        [HttpPost("milestones")]
        public async Task<ActionResult<MilestoneReadDto>> CreateMilestone([FromBody] MilestoneCreateDto dto)
        {
            // Security: Restricted to Foreman (RoleID 2) or Admin (RoleID 1)
            var role = GetUserRole();
            if (role != "1" && role != "2" && role != "4")
                return StatusCode(StatusCodes.Status403Forbidden, "Only Admin, Foreman, or Owner can create milestones.");

            var milestone = new Milestone
            {
                ProjectID = dto.ProjectID,
                Title = dto.Title,
                Description = dto.Description,
                DueDate = dto.DueDate,
                Status = "NotStarted", // System default 
                CreatedAt = DateTime.UtcNow,
                Progress = dto.Progress
            };

            _context.Milestones.Add(milestone);
            await _context.SaveChangesAsync();

            var response = new MilestoneReadDto
            {
                MilestoneID = milestone.MilestoneID,
                ProjectID = milestone.ProjectID,
                Title = milestone.Title,
                Status = milestone.Status,
                CreatedAt = milestone.CreatedAt
            };

            return CreatedAtAction(nameof(GetProjectMilestones), new { projectId = milestone.ProjectID }, response);
        }

        // --- UPDATE: MILESTONE DETAILS ---
        // PUT /api/milestones/{id}
        [HttpPut("milestones/{id}")]
        public async Task<IActionResult> UpdateMilestone(int id, [FromBody] MilestoneUpdateDto dto)
        {
            var milestone = await _context.Milestones.FindAsync(id);
            if (milestone == null) return NotFound();

            // Security: Restricted to Foreman or Admin
            var role = GetUserRole();
            if (role != "1" && role != "2" && role != "4")
                return StatusCode(StatusCodes.Status403Forbidden, "Only Admin, Foreman, or Owner can update milestones.");

            milestone.Title = dto.Title;
            milestone.Description = dto.Description;
            milestone.DueDate = dto.DueDate;
            milestone.Status = dto.Status;
            milestone.CompletedDate = dto.CompletedDate;

            if (dto.Progress.HasValue)
            {
                milestone.Progress = dto.Progress.Value;
            }

            await _context.SaveChangesAsync();

            return NoContent();
        }

        // DELETE: /api/milestones/{id}
        [HttpDelete("milestones/{id}")]
        public async Task<IActionResult> DeleteMilestone(int id)
        {
            var milestone = await _context.Milestones.FindAsync(id);
            if (milestone == null) return NotFound();

            var role = GetUserRole();

            // Allow Admin (1), Foreman (2), or Owner (4)
            if (role != "1" && role != "2" && role != "4")
                return StatusCode(StatusCodes.Status403Forbidden,
                    "Only Admin, Foreman, or Owner can delete milestones.");

            _context.Milestones.Remove(milestone);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        // --- PRIVATE HELPERS ---
        private string? GetCurrentUserId() => User.FindFirstValue(ClaimTypes.NameIdentifier);
        private string? GetUserRole() => User.FindFirst("RoleID")?.Value;
    }
}