using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Projello.Api.Data;
using Projello.Api.Models;
using Projello.Api.DTOs;
using System.Security.Claims;
using Microsoft.AspNetCore.Identity;   // ← ADDED
using Microsoft.AspNetCore.SignalR; // ← Do not remove
using Projello.Api.Hubs; // ← Do not remove

namespace Projello.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class ProjectsController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly UserManager<User> _userManager;   // ← ADDED
        private readonly IHubContext<TeamNotificationHub> _teamNotificationHub;   // ← Do not remove

        public ProjectsController(
            AppDbContext context,
            UserManager<User> userManager,
            IHubContext<TeamNotificationHub> teamNotificationHub)
        {
            _context = context;
            _userManager = userManager;
            _teamNotificationHub = teamNotificationHub;
        }

        // --- READ ALL (GET: api/projects) ---
        [HttpGet]
        public async Task<ActionResult<IEnumerable<ProjectReadDto>>> GetProjects()
        {
            var userId = GetCurrentUserId();
            var role = GetUserRole();

            var query = _context.Projects
                .Include(p => p.Client)
                .AsQueryable();

            // ← NEW: Get current user's company for proper scoping
            var currentUser = await _userManager.FindByIdAsync(userId!);
            var userCompanyId = currentUser?.CompanyId;

            if (role != "1") // Not a global Admin
            {
                if (userCompanyId != null)
                {
                    // Only show projects whose client belongs to the same company
                    query = query.Where(p => p.Client != null && p.Client.CompanyID == userCompanyId);
                }
                else
                {
                    // User has no company → see nothing
                    query = query.Where(p => false);
                }

                // Non-Owners can only see projects they are members of
                if (role != "4")
                {
                    query = query.Where(p => p.Members.Any(m => m.UserID == userId));
                }
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
                    .ThenInclude(pm => pm.User)
                .FirstOrDefaultAsync(p => p.ProjectID == id);

            if (project == null) return NotFound();

            var role = GetUserRole();
            var userId = GetCurrentUserId();

            // Security Check
            if (role != "1")
            {
                var currentUser = await _userManager.FindByIdAsync(userId!);
                if (currentUser?.CompanyId != null && project.Client?.CompanyID != currentUser.CompanyId)
                    return Forbid();

                if (role != "4" && !project.Members.Any(m => m.UserID == userId))
                    return Forbid();
            }

            if (GetUserRole() == "4")
            {
                var currentUser = await _userManager.FindByIdAsync(userId!);
                if (currentUser?.CompanyId == null || project.Client?.CompanyID != currentUser.CompanyId)
                    return Forbid();
            }

            var memberDtos = project.Members.Select(m => new ProjectMemberDto
            {
                UserID = m.UserID,
                FullName = m.User.FullName,
                AssignedAs = m.AssignedAs
            }).ToList();

            return Ok(new ProjectReadDto
            {
                ProjectID = project.ProjectID,
                Name = project.Name,
                Description = project.Description,
                Status = project.Status,
                DueDate = project.DueDate,
                CreatedAt = project.CreatedAt,
                ClientID = project.ClientID,
                ClientName = project.Client?.Name ?? "Unknown",
                IsClientBlacklisted = project.Client?.IsBlacklisted ?? false,
                Members = memberDtos,

               
                TotalPaid = project.TotalPaid,
                Outstanding = project.Outstanding
            });
        }

        // --- CREATE (POST: api/projects) ---
        [HttpPost]
        public async Task<ActionResult<ProjectReadDto>> CreateProject([FromBody] ProjectCreateDto dto)
        {
            if (GetUserRole() != "1" && GetUserRole() != "4") return Forbid();

            var currentUser = await _userManager.FindByIdAsync(GetCurrentUserId()!);
            var userCompanyId = currentUser?.CompanyId;

            // ← NEW: Validate that the client belongs to the user's company
            if (GetUserRole() != "1")
            {
                var client = await _context.Clients.FindAsync(dto.ClientID);
                if (client == null) return BadRequest("Client not found.");

                if (userCompanyId != null && client.CompanyID != userCompanyId)
                    return Forbid("You can only create projects for clients in your own company.");
            }

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
            var project = await _context.Projects
                .Include(p => p.Client)
                .FirstOrDefaultAsync(p => p.ProjectID == id);
            if (project == null) return NotFound();

            var role = GetUserRole();
            var userId = GetCurrentUserId();

            var isForeman = await _context.ProjectMembers
                .AnyAsync(m => m.ProjectID == id && m.UserID == userId && m.AssignedAs == "Foreman");

            if (role == "4")
            {
                var currentUser = await _userManager.FindByIdAsync(userId!);
                if (currentUser?.CompanyId == null || project.Client?.CompanyID != currentUser.CompanyId)
                    return Forbid();
            }
            else if (role != "1" && !isForeman)
            {
                return Forbid();
            }

            project.Name = dto.Name;
            project.Description = dto.Description;
            project.ClientID = dto.ClientID;
            project.StartDate = dto.StartDate.HasValue ? DateOnly.FromDateTime(dto.StartDate.Value) : null;
            project.DueDate = dto.DueDate.HasValue ? DateOnly.FromDateTime(dto.DueDate.Value) : null;

            // Map the new financials securely onto the database record
            project.TotalPaid = dto.TotalPaid;
            project.Outstanding = dto.Outstanding;

            // Save changes cleanly without looking for 'ProjectExists'
            await _context.SaveChangesAsync();
            return NoContent();
        }

        // Old project update endpoint
        // [HttpPut("{id}")]
        // public async Task<IActionResult> UpdateProject(int id, [FromBody] ProjectUpdateDto dto)
        // {
        //     var project = await _context.Projects.FindAsync(id);
        //     if (project == null) return NotFound();

        //     bool isForeman = await _context.ProjectMembers
        //         .AnyAsync(m => m.ProjectID == id && m.UserID == GetCurrentUserId() && m.AssignedAs == "Foreman");

        //     if (GetUserRole() != "1" && !isForeman) return Forbid();

        //     project.Name = dto.Name;
        //     project.Description = dto.Description;
        //     project.ClientID = dto.ClientID;

        //     project.StartDate = dto.StartDate.HasValue ? DateOnly.FromDateTime(dto.StartDate.Value) : null;
        //     project.DueDate = dto.DueDate.HasValue ? DateOnly.FromDateTime(dto.DueDate.Value) : null;

        //     await _context.SaveChangesAsync();
        //     return NoContent();
        // }

        // --- UPDATE STATUS ONLY ---
        [HttpPut("{id}/status")]
        public async Task<IActionResult> UpdateProjectStatus(int id, [FromBody] ProjectStatusUpdateDto dto)
        {
            var project = await _context.Projects.FindAsync(id);
            if (project == null) return NotFound();

            var isForeman = await _context.ProjectMembers
                .AnyAsync(m => m.ProjectID == id && m.UserID == GetCurrentUserId() && m.AssignedAs == "Foreman");

            if (GetUserRole() != "1" && GetUserRole() != "4" && !isForeman) return Forbid();

            project.Status = dto.Status;
            await _context.SaveChangesAsync();

            return NoContent();
        }

        // --- DELETE ---
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteProject(int id)
        {
            if (GetUserRole() != "1" && GetUserRole() != "4") return Forbid();

            var project = await _context.Projects.FindAsync(id);
            if (project == null) return NotFound();

            _context.Projects.Remove(project);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        [HttpPost("{projectId}/members")]
        public async Task<IActionResult> AddProjectMember(int projectId, [FromBody] AddProjectMemberDto dto)
        {
            var userId = GetCurrentUserId();
            var role = GetUserRole();

            // Only Owners, Foremen, or Global Admins can add members
            if (role != "1" && role != "4")
            {
                var isForeman = await _context.ProjectMembers
                    .AnyAsync(m => m.ProjectID == projectId &&
                                  m.UserID == userId &&
                                  m.AssignedAs == "Foreman");

                if (!isForeman) return Forbid();
            }

            // Check if project exists and belongs to same company
            var project = await _context.Projects
                .Include(p => p.Client)
                .FirstOrDefaultAsync(p => p.ProjectID == projectId);

            if (project == null) return NotFound("Project not found");

            var currentUser = await _userManager.FindByIdAsync(userId!);
            if (currentUser?.CompanyId != null && project.Client?.CompanyID != currentUser.CompanyId)
                return Forbid();

            // Check if user exists and is in same company
            var targetUser = await _userManager.FindByIdAsync(dto.UserID);
            if (targetUser == null) return BadRequest("User not found");
            if (targetUser.CompanyId != currentUser?.CompanyId)
                return BadRequest("User must be in the same company");

            // Check if already a member
            var existing = await _context.ProjectMembers
                .AnyAsync(m => m.ProjectID == projectId && m.UserID == dto.UserID);

            if (existing) return BadRequest("User is already a member of this project");

            // Add the member
            var member = new ProjectMember
            {
                ProjectID = projectId,
                UserID = dto.UserID,
                AssignedAs = dto.AssignedAs ?? "Worker"
            };

            _context.ProjectMembers.Add(member);
            await _context.SaveChangesAsync();

            var joinedBy = await _userManager.FindByIdAsync(userId!);

            var notification = new
            {
                projectId,
                projectName = project.Name,
                memberName = targetUser.FullName,
                assignedAs = member.AssignedAs ?? "Worker",
                message = $"{targetUser.FullName} joined {project.Name} as {member.AssignedAs ?? "Worker"}."
            };

            if (joinedBy != null)
            {
                await _teamNotificationHub.Clients.User(userId!).SendAsync("WorkerJoinedProject", notification);
            }

            await _teamNotificationHub.Clients.User(dto.UserID).SendAsync("WorkerJoinedProject", notification);

            return Ok(new { message = "Member added successfully" });
            
        }

        // --- REMOVE MEMBER ---
        [HttpDelete("{projectId}/members/{userId}")]
        public async Task<IActionResult> RemoveProjectMember(int projectId, string userId)
        {
            var role = GetUserRole();
            var currentUserId = GetCurrentUserId();

            if (role != "1" && role != "4")
            {
                var isForeman = await _context.ProjectMembers.AnyAsync(m =>
                    m.ProjectID == projectId &&
                    m.UserID == currentUserId &&
                    m.AssignedAs == "Foreman");

                if (!isForeman) return Forbid();
            }

            var member = await _context.ProjectMembers.FirstOrDefaultAsync(m =>
                m.ProjectID == projectId && m.UserID == userId);

            if (member == null) return NotFound("Member not found.");

            _context.ProjectMembers.Remove(member);
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
            IsClientBlacklisted = p.Client?.IsBlacklisted ?? false,

            TotalPaid = p.TotalPaid,
            Outstanding = p.Outstanding
        };
    }
}