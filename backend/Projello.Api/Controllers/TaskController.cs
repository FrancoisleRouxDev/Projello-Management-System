using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Projello.Api.Data;
using Projello.Api.DTOs;
using Projello.Api.Models;

namespace Projello.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TaskController : ControllerBase
{
    private readonly AppDbContext _context;

    public TaskController(AppDbContext context)
    {
        _context = context;
    }

    [HttpPost]
    public async Task<IActionResult> CreateTask([FromBody] CreateTaskDto dto)
    {
        var milestoneExists = await _context.Milestones.AnyAsync(m => m.MilestoneId == dto.MilestoneId);
        if (!milestoneExists)
        {
            return BadRequest($"Milestone {dto.MilestoneId} does not exist.");
        }

        var task = new TaskItem
        {
            MilestoneId = dto.MilestoneId,
            Title = dto.Title,
            Description = dto.Description,
            AssignedToUserId = dto.AssignedToUserId,
            Priority = dto.Priority,
            Status = dto.Status
        };

        _context.Tasks.Add(task);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetTaskById), new { id = task.TaskId }, task);
    }

    [HttpGet("milestone/{milestoneId:int}")]
    public async Task<ActionResult<IEnumerable<TaskItem>>> GetByMilestone(int milestoneId)
    {
        return await _context.Tasks
            .AsNoTracking()
            .Where(t => t.MilestoneId == milestoneId)
            .ToListAsync();
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<TaskItem>> GetTaskById(int id)
    {
        var task = await _context.Tasks.AsNoTracking().FirstOrDefaultAsync(t => t.TaskId == id);
        if (task is null)
        {
            return NotFound();
        }

        return task;
    }
}