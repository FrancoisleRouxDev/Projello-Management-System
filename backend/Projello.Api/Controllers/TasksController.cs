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

        // --- CREATE: ASSIGN TASK ---
        // POST /api/tasks
        [HttpPost]
        public async Task<ActionResult<TaskReadDto>> CreateTask([FromBody] TaskCreateDto dto)
        {
            var role = GetUserRole();
            // Security: Only Foreman (2) or Admin (1) can assign tasks
            if (role != "1" && role != "2")
                return Forbid("Only Foremen or Admins can assign tasks.");

            var task = new TaskItem
            {
                MilestoneID = dto.MilestoneID,
                Title = dto.Title,
                Description = dto.Description,
                AssignedToUserID = dto.AssignedToUserID,
                DueDate = dto.DueDate,
                Priority = dto.Priority,
                Status = Status.NotStarted, // Uses Enum from TaskItem.cs
                CreatedAt = DateTime.UtcNow
            };

            _context.Tasks.Add(task);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetMyTasks), null, new { id = task.TaskID });
        }

        // --- READ: MY ASSIGNED TASKS ---
        // GET /api/tasks/my-tasks
        [HttpGet("my-tasks")]
        public async Task<ActionResult<IEnumerable<TaskReadDto>>> GetMyTasks()
        {
            var userId = GetCurrentUserId();

            var tasks = await _context.Tasks
                .Include(t => t.Milestone)
                .Include(t => t.AssignedTo)
                .Where(t => t.AssignedToUserID == userId)
                .Select(t => new TaskReadDto
                {
                    TaskID = t.TaskID,
                    MilestoneID = t.MilestoneID,
                    MilestoneTitle = t.Milestone.Title,
                    Title = t.Title,
                    Description = t.Description,
                    AssignedToUserID = t.AssignedToUserID,
                    AssignedToFullName = t.AssignedTo != null ? t.AssignedTo.FullName : "Unassigned",
                    Status = t.Status.ToString(),
                    Priority = t.Priority,
                    DueDate = t.DueDate,
                    CreatedAt = t.CreatedAt
                })
                .ToListAsync();

            return Ok(tasks);
        }

        // --- UPDATE: TASK STATUS ---
        // PATCH /api/tasks/{id}/status
        [HttpPatch("{id}/status")]
        public async Task<IActionResult> UpdateTaskStatus(int id, [FromBody] TaskStatusUpdateDto dto)
        {
            var task = await _context.Tasks.FindAsync(id);
            if (task == null) return NotFound();

            var userId = GetCurrentUserId();
            var role = GetUserRole();

            // Security: Only the person assigned to the task, a Foreman, or an Admin can change status
            if (task.AssignedToUserID != userId && role != "1" && role != "2")
            {
                return Forbid();
            }

            // Parse the string from DTO to the Enum defined in TaskItem.cs
            if (Enum.TryParse<Status>(dto.Status, true, out var newStatus))
            {
                task.Status = newStatus;
                await _context.SaveChangesAsync();
                return NoContent();
            }

            return BadRequest("Invalid status value. Use: NotStarted, InProgress, Completed, or Blocked.");
        }

        // --- PRIVATE HELPERS ---
        private string? GetCurrentUserId() => User.FindFirstValue(ClaimTypes.NameIdentifier);
        private string? GetUserRole() => User.FindFirst("RoleID")?.Value;
    }
}