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

        // --- READ ALL (GET: api/projects) ---
        [HttpGet]
        public async Task<ActionResult<IEnumerable<ProjectReadDto>>> GetProjects()
        {
            var userId = GetCurrentUserId();
            var role = GetUserRole();

            var query = _context.Projects.Include(p => p.Client).AsQueryable();

            // Security: Only Admins (Role 1) see all. Others see assigned projects.
            if (role != "1")
            {
                query = query.Where(p => p.Members.Any(m => m.UserID == userId));
            }

            var projects = await query.ToListAsync();
            return Ok(projects.Select(p => MapToReadDto(p)));
        }

        // --- READ ONE (GET: api/projects/{id}) ---
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

            return Ok(MapToReadDto(project));
        }

        // --- CREATE (POST: api/projects) ---
        [HttpPost]
        public async Task<ActionResult<ProjectReadDto>> CreateProject([FromBody] ProjectCreateDto dto)
        {
            if (GetUserRole() != "1") return Forbid(); // Only Admins can create

            var project = new Project
            {
                Name = dto.Name,
                ClientID = dto.ClientID,
                Description = dto.Description,
                StartDate = dto.StartDate, 
                DueDate = dto.DueDate,     
                Status = "Planning", 
                CreatedByUserID = GetCurrentUserId()!, 
                CreatedAt = DateTime.UtcNow
            };

            _context.Projects.Add(project);
            await _context.SaveChangesAsync();

            await _context.Entry(project).Reference(p => p.Client).LoadAsync();

            return CreatedAtAction(nameof(GetProject), new { id = project.ProjectID }, MapToReadDto(project));
        }

        // --- UPDATE FULL (PUT: api/projects/{id}) ---
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateProject(int id, [FromBody] ProjectUpdateDto dto)
        {
            var project = await _context.Projects.FindAsync(id);
            if (project == null) return NotFound();

            // Permission: Admin OR assigned Foreman
            bool isForeman = await _context.ProjectMembers
                .AnyAsync(m => m.ProjectID == id && m.UserID == GetCurrentUserId() && m.AssignedAs == "Foreman");

            if (GetUserRole() != "1" && !isForeman) return Forbid();

            // Map string/int fields
            project.Name = dto.Name;
            project.Description = dto.Description;
            project.ClientID = dto.ClientID;
            
            // --- FULLY SAFE DATE CONVERSION ---
            // Converts nullable DateTime (DTO) to nullable DateOnly (Model)
            project.StartDate = dto.StartDate.HasValue 
                ? DateOnly.FromDateTime(dto.StartDate.Value) 
                : null;

            project.DueDate = dto.DueDate.HasValue 
                ? DateOnly.FromDateTime(dto.DueDate.Value) 
                : null;

            await _context.SaveChangesAsync();
            return NoContent();
        }

        // --- UPDATE STATUS ONLY (PUT: api/projects/{id}/status) ---
        [HttpPut("{id}/status")]
        public async Task<IActionResult> UpdateProjectStatus(int id, [FromBody] ProjectStatusUpdateDto dto)
        {
            var project = await _context.Projects.FindAsync(id);
            if (project == null) return NotFound();

            var isForeman = await _context.ProjectMembers
                .AnyAsync(m => m.ProjectID == id && m.UserID == GetCurrentUserId() && m.AssignedAs == "Foreman");

            if (GetUserRole() != "1" && !isForeman) return Forbid();

            project.Status = dto.Status;
            await _context.SaveChangesAsync();

            return NoContent();
        }

        // --- DELETE (DELETE: api/projects/{id}) ---
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteProject(int id)
        {
            if (GetUserRole() != "1") return Forbid(); // Only Admins can delete

            var project = await _context.Projects.FindAsync(id);
            if (project == null) return NotFound();

            _context.Projects.Remove(project);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        // --- PRIVATE HELPERS ---
        private string? GetCurrentUserId() => User.FindFirstValue(ClaimTypes.NameIdentifier);
        
        private string? GetUserRole() => User.FindFirst("RoleID")?.Value;

        private ProjectReadDto MapToReadDto(Project p) => new ProjectReadDto
        {
            ProjectID = p.ProjectID,
            Name = p.Name,
            Description = p.Description,
            Status = p.Status,
            DueDate = p.DueDate,
            CreatedAt = p.CreatedAt,
            ClientID = p.ClientID,
            ClientName = p.Client?.Name ?? "Unknown",
            IsClientBlacklisted = p.Client?.IsBlacklisted ?? false
        };
    }
}