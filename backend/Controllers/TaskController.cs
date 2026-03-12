using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Data;
using Backend.Models;
using Backend.DTOs;
using System.Net;
using System.Security.Cryptography.X509Certificates;

namespace Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TaskController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public TaskController(ApplicationDbContext context)
    {
        _context = context;
    }

    //POST: api/Task
    // Used by Foremen to assign tasks to workers

    [HttpPost]
    public async Task<IActionResult> CreateTask(CreateTaskDto TaskDto)
    {
        var task = new TaskItem
        {
            MilestoneID = TaskDto.MilestoneID,
            Title = TaskDto.Title,
            Description = TaskDto.Description,
            AssignedToUserID = TaskDto.AssignedToUserID,
            PriorityQueue = TaskDto.Priority,
            FtpStatusCode = "Pending",
        };

        _context.Tasks.Add(task);
        await  _context.SaveChangesAsync();

        return Ok(task);
    
    }
     
    // GET: api/Task/Milestone/5
    // Retrieves all tasks with a specific milestone
    [HttpGet("Milestone/{milestoneId}")]
    public async Task<ActionResult<IEnumerable<TaskItem>>> GetTaskByMilestone(int milestoneId)
    {
        return await _context.Tasks
            .Where(task => task.MilestoneID == milestoneId)
            .ToListAsync();
    }

}