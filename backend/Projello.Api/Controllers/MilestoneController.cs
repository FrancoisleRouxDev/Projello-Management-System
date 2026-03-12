using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Projello.Api.Data;
using Projello.Api.DTOs;
using Projello.Api.Models;

namespace Projello.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class MilestoneController : ControllerBase
{
    private readonly AppDbContext _context;

    public MilestoneController(AppDbContext context)
    {
        _context = context;
    }

    [HttpPost]
    public async Task<IActionResult> CreateMilestone([FromBody] CreateMilestoneDto dto)
    {
        var milestone = new Milestone
        {
            Title = dto.Title,
            Description = dto.Description,
            DueDate = dto.DueDate,
            Status = dto.Status
        };

        _context.Milestones.Add(milestone);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetMilestoneById), new { id = milestone.MilestoneId }, milestone);
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Milestone>>> GetMilestones()
    {
        return await _context.Milestones.AsNoTracking().ToListAsync();
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<Milestone>> GetMilestoneById(int id)
    {
        var milestone = await _context.Milestones.AsNoTracking().FirstOrDefaultAsync(m => m.MilestoneId == id);
        if (milestone is null)
        {
            return NotFound();
        }

        return milestone;
    }
}