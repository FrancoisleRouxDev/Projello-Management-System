using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Projello.Api.Data;
using Projello.Api.Models;
using Projello.Api.DTOs;
using System.Security.Claims;

namespace Projello.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class TasksController : ControllerBase
    {
        private readonly AppDbContext _context;

        public TasksController(AppDbContext context)
        {
            _context = context;
        }

        // --- CREATE ---
        [HttpPost]
        public async Task<ActionResult<TaskReadDto>> CreateTask([FromBody] TaskCreateDto dto)
        {
            // 1. Validation: Ensure Milestone exists
            var milestone = await _context.Milestones.FindAsync(dto.MilestoneID);
            if (milestone == null) return NotFound("Milestone not found.");

            // 2. Security: Only Admin or the Foreman assigned to THIS project
            if (!await IsUserForemanOrAdmin(milestone.ProjectID))
                return Forbid("Only Foremen of this project or Admins can assign tasks.");

            // 3. Validation: Ensure the assigned user is actually a member of this project
            if (!string.IsNullOrEmpty(dto.AssignedToUserID))
            {
                var isMember = await _context.ProjectMembers
                    .AnyAsync(m => m.ProjectID == milestone.ProjectID && m.UserID == dto.AssignedToUserID);
                if (!isMember) return BadRequest("The assigned user is not a member of this project.");
            }

            var task = new TaskItem
            {
                MilestoneID = dto.MilestoneID,
                Title = dto.Title,
                Description = dto.Description,
                AssignedToUserID = dto.AssignedToUserID,
                DueDate = dto.DueDate, // DTO and Model both use DateOnly?
                Priority = dto.Priority,
                Status = Status.NotStarted,
                CreatedAt = DateTime.UtcNow
            };

            _context.Tasks.Add(task);
            await _context.SaveChangesAsync();

            // Load navigation properties for the ReadDto response
            await _context.Entry(task).Reference(t => t.Milestone).LoadAsync();
            await _context.Entry(task).Reference(t => t.AssignedTo).LoadAsync();

            return CreatedAtAction(nameof(GetTask), new { id = task.TaskID }, MapToReadDto(task));
        }

        // --- READ: Single Task ---
        [HttpGet("{id}")]
        public async Task<ActionResult<TaskReadDto>> GetTask(int id)
        {
            var task = await _context.Tasks
                .Include(t => t.Milestone)
                .Include(t => t.AssignedTo)
                .FirstOrDefaultAsync(t => t.TaskID == id);

            if (task == null) return NotFound();

            // Security: Check access
            if (!await HasProjectAccess(task.Milestone.ProjectID)) return Forbid();

            return Ok(MapToReadDto(task));
        }

        // --- READ: My Assigned Tasks ---
        [HttpGet("my-tasks")]
        public async Task<ActionResult<IEnumerable<TaskReadDto>>> GetMyTasks()
        {
            var userId = GetCurrentUserId();
            var tasks = await _context.Tasks
                .Include(t => t.Milestone)
                .Include(t => t.AssignedTo)
                .Where(t => t.AssignedToUserID == userId)
                .ToListAsync();

            return Ok(tasks.Select(MapToReadDto));
        }

        // --- READ: Milestone Tasks ---
        [HttpGet("milestone/{milestoneId}")]
        public async Task<ActionResult<IEnumerable<TaskReadDto>>> GetTasksByMilestone(int milestoneId)
        {
            var milestone = await _context.Milestones.FindAsync(milestoneId);
            if (milestone == null) return NotFound();
            
            if (!await HasProjectAccess(milestone.ProjectID)) return Forbid();

            var tasks = await _context.Tasks
                .Include(t => t.AssignedTo)
                .Where(t => t.MilestoneID == milestoneId)
                .ToListAsync();

            return Ok(tasks.Select(MapToReadDto));
        }

        // --- READ: Project Tasks (For Foremen/Admins) ---
        [HttpGet("project/{projectId}")]
        public async Task<ActionResult<IEnumerable<TaskReadDto>>> GetTasksByProject(int projectId)
        {
            if (!await IsUserForemanOrAdmin(projectId)) return Forbid();

            var tasks = await _context.Tasks
                .Include(t => t.Milestone)
                .Include(t => t.AssignedTo)
                .Where(t => t.Milestone.ProjectID == projectId)
                .ToListAsync();

            return Ok(tasks.Select(MapToReadDto));
        }

        // --- UPDATE: Full Edit ---
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateTask(int id, [FromBody] TaskUpdateDto dto)
        {
            var task = await _context.Tasks.Include(t => t.Milestone).FirstOrDefaultAsync(t => t.TaskID == id);
            if (task == null) return NotFound();

            if (!await IsUserForemanOrAdmin(task.Milestone.ProjectID)) return Forbid();

            // Validation: Ensure reassigned user is part of the project
            var isMember = await _context.ProjectMembers
                .AnyAsync(m => m.ProjectID == task.Milestone.ProjectID && m.UserID == dto.AssignedToUserID);
            if (!isMember) return BadRequest("The assigned user is not a member of this project.");

            task.Title = dto.Title;
            task.Description = dto.Description;
            task.Priority = dto.Priority;
            task.AssignedToUserID = dto.AssignedToUserID;
            
            // FIX for CS0029: Conversion from DTO DateTime? to Model DateOnly?
            task.DueDate = dto.DueDate.HasValue ? DateOnly.FromDateTime(dto.DueDate.Value) : null;

            await _context.SaveChangesAsync();
            return NoContent();
        }

        // --- UPDATE: Status Only ---
        [HttpPatch("{id}/status")]
        public async Task<IActionResult> UpdateTaskStatus(int id, [FromBody] TaskStatusUpdateDto dto)
        {
            var task = await _context.Tasks.Include(t => t.Milestone).FirstOrDefaultAsync(t => t.TaskID == id);
            if (task == null) return NotFound();

            bool isAssigned = task.AssignedToUserID == GetCurrentUserId();
            if (!isAssigned && !await IsUserForemanOrAdmin(task.Milestone.ProjectID)) return Forbid();

            if (Enum.TryParse<Status>(dto.Status, true, out var newStatus))
            {
                // Business Rule: Dependency check
                if (newStatus == Status.Completed && task.Milestone.Status == "Blocked")
                    return BadRequest("Cannot complete task while the milestone is blocked.");

                task.Status = newStatus;
                await _context.SaveChangesAsync();
                return NoContent();
            }
            return BadRequest("Invalid status value.");
        }

        // --- DELETE ---
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteTask(int id)
        {
            var task = await _context.Tasks.Include(t => t.Milestone).FirstOrDefaultAsync(t => t.TaskID == id);
            if (task == null) return NotFound();

            if (!await IsUserForemanOrAdmin(task.Milestone.ProjectID)) return Forbid();

            _context.Tasks.Remove(task);
            await _context.SaveChangesAsync();
            return NoContent();
        }

        // --- PRIVATE HELPERS ---
        private string? GetCurrentUserId() => User.FindFirstValue(ClaimTypes.NameIdentifier);
        private string? GetUserRole() => User.FindFirst("RoleID")?.Value;

        private async Task<bool> IsUserForemanOrAdmin(int projectId)
        {
            var role = GetUserRole();
            if (role == "1") return true; // Global Admin
            
            return await _context.ProjectMembers.AnyAsync(m => 
                m.ProjectID == projectId && 
                m.UserID == GetCurrentUserId() && 
                m.AssignedAs == "Foreman");
        }

        private async Task<bool> HasProjectAccess(int projectId)
        {
            if (GetUserRole() == "1") return true;
            return await _context.ProjectMembers.AnyAsync(m => m.ProjectID == projectId && m.UserID == GetCurrentUserId());
        }

        private TaskReadDto MapToReadDto(TaskItem t) => new TaskReadDto
        {
            TaskID = t.TaskID,
            MilestoneID = t.MilestoneID,
            MilestoneTitle = t.Milestone?.Title ?? "N/A",
            Title = t.Title,
            Description = t.Description,
            AssignedToUserID = t.AssignedToUserID,
            AssignedToFullName = t.AssignedTo?.FullName ?? "Unassigned",
            Status = t.Status.ToString(),
            Priority = t.Priority,
            DueDate = t.DueDate, // DTO and Model now consistent as DateOnly?
            CreatedAt = t.CreatedAt
        };
    }
}