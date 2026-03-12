using Microsoft.AspNetCore.Mvc;
using backend.Data;
using backend.Models;

namespace Backend.Controllers;

[ApiController]
[Route("api/[controller]")]

public class MilestoneController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public MilestoneController(ApplicationDbContext context) => _context = context;

    [HttpPost]
    public async Task<IActionResult> CreateMilestone(MilestoneController milestone)
    {
        _context.Milestones.Add(milestone);
        await _context.SaveChangesAsync();
        return Ok(milestone);
    }
}