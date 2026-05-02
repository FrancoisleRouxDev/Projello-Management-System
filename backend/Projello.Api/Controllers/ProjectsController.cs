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
    [Authorize] // Requires a valid JWT for all endpoints
    public class ProjectsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public ProjectsController(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/projects
        // Returns a list of projects the user is authorized to see
        [HttpGet]
        public async Task<ActionResult<IEnumerable<ProjectReadDto>>> GetProjects()
        {
            var userId = GetCurrentUserId();
            var role = GetUserRole();

            // Start query including Client to satisfy ProjectReadDto requirements
            var query = _context.Projects.Include(p => p.Client).AsQueryable();

            // Security Logic: Only Admins (Role 1) see all projects. 
            // Others only see projects they are assigned to in ProjectMembers.
            if (role != "1")
            {
                query = query.Where(p => p.Members.Any(m => m.UserID == userId));
            }

            var projects = await query.ToListAsync();

            // Map Models to DTOs
            var projectDtos = projects.Select(p => new ProjectReadDto
            {
                ProjectID = p.ProjectID,
                Name = p.Name,
                Description = p.Description,
                Status = p.Status,
                DueDate = p.DueDate,
                CreatedAt = p.CreatedAt,
                ClientID = p.ClientID,
                ClientName = p.Client.Name,
                IsClientBlacklisted = p.Client.IsBlacklisted
            });

            return Ok(projectDtos);
        }

        // GET: api/projects/{id}
        [HttpGet("{id}")]
        public async Task<ActionResult<ProjectReadDto>> GetProject(int id)
        {
            var project = await _context.Projects
                .Include(p => p.Client)
                .Include(p => p.Members)
                .FirstOrDefaultAsync(p => p.ProjectID == id);

            if (project == null) return NotFound();

            // Security Check: Must be Admin OR a member of this specific project
            if (GetUserRole() != "1" && !project.Members.Any(m => m.UserID == GetCurrentUserId()))
            {
                return Forbid();
            }

            return Ok(new ProjectReadDto
            {
                ProjectID = project.ProjectID,
                Name = project.Name,
                Description = project.Description,
                Status = project.Status,
                DueDate = project.DueDate,
                CreatedAt = project.CreatedAt,
                ClientID = project.ClientID,
                ClientName = project.Client.Name,
                IsClientBlacklisted = project.Client.IsBlacklisted
            });
        }

        // POST: api/projects
        // Only Admins can create new projects
        [HttpPost]
        public async Task<ActionResult<ProjectReadDto>> CreateProject([FromBody] ProjectCreateDto dto)
        {
            if (GetUserRole() != "1") return Forbid();

            var project = new Project
            {
                Name = dto.Name,
                ClientID = dto.ClientID,
                Description = dto.Description,
                StartDate = dto.StartDate,
                DueDate = dto.DueDate,
                Status = "Planning", // System default
                CreatedByUserID = GetCurrentUserId()!,
                CreatedAt = DateTime.UtcNow
            };

            _context.Projects.Add(project);
            await _context.SaveChangesAsync();

            // Fetch with Client info to return the full ReadDto
            await _context.Entry(project).Reference(p => p.Client).LoadAsync();

            var response = new ProjectReadDto
            {
                ProjectID = project.ProjectID,
                Name = project.Name,
                Status = project.Status,
                ClientID = project.ClientID,
                ClientName = project.Client.Name,
                IsClientBlacklisted = project.Client.IsBlacklisted
            };

            return CreatedAtAction(nameof(GetProject), new { id = project.ProjectID }, response);
        }

        // PUT: api/projects/{id}/status
        // Allows status updates by Admins or the assigned Foreman
        [HttpPut("{id}/status")]
        public async Task<IActionResult> UpdateProjectStatus(int id, [FromBody] ProjectStatusUpdateDto dto)
        {
            var project = await _context.Projects.FindAsync(id);
            if (project == null) return NotFound();

            // Permission logic: Admin OR a ProjectMember with the 'Foreman' tag
            var isForeman = await _context.ProjectMembers
                .AnyAsync(m => m.ProjectID == id && m.UserID == GetCurrentUserId() && m.AssignedAs == "Foreman");

            if (GetUserRole() != "1" && !isForeman) return Forbid();

            project.Status = dto.Status;
            await _context.SaveChangesAsync();

            return NoContent();
        }

        // --- PRIVATE HELPERS ---
        private string? GetCurrentUserId() => User.FindFirstValue(ClaimTypes.NameIdentifier);
        
        private string? GetUserRole() => User.FindFirst("RoleID")?.Value;
    }
}