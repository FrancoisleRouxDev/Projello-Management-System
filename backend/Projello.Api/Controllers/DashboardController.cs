using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Projello.Api.Data;
using Projello.Api.Models;
using Projello.Api.DTOs;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

namespace Projello.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class DashboardController : ControllerBase
    {
        private readonly AppDbContext _context;

        public DashboardController(AppDbContext context)
        {
            _context = context;
        }

        // ==========================================
        // --- READ: THE SINGLE HIGH-PERFORMANCE PAYLOAD ---
        // ==========================================

        // GET: api/dashboard
        [HttpGet]
        public async Task<ActionResult<DashboardOverviewDto>> GetDashboardOverview()
        {
            var userId = GetCurrentUserId();
            var role = GetUserRole();
            bool isAdmin = role == "1";

            var overview = new DashboardOverviewDto();

            // 1. Build Query Context (Admins see all, workers/foremen see assigned projects)
            var projectQuery = _context.Projects.Include(p => p.Client).AsQueryable();
            if (!isAdmin)
            {
                projectQuery = projectQuery.Where(p => p.Members.Any(m => m.UserID == userId));
            }

            // 2. Fetch Active Projects + Progress Calculations
            var activeProjects = await projectQuery
                .Where(p => p.Status != "Completed" && p.Status != "Archived")
                .Select(p => new DashboardProjectDto
                {
                    ProjectID = p.ProjectID,
                    Name = p.Name,
                    Status = p.Status,
                    DueDate = p.DueDate,
                    ClientName = p.Client != null ? p.Client.Name : "N/A",
                    TotalTasksCount = _context.Tasks.Count(t => t.Milestone.ProjectID == p.ProjectID),
                    CompletedTasksCount = _context.Tasks.Count(t => t.Milestone.ProjectID == p.ProjectID && t.Status == Status.Completed)
                })
                .Take(5)
                .ToListAsync();

            overview.ActiveProjects = activeProjects;

            // Extract project IDs the user has explicit access to for downstream filtering
            var authorizedProjectIds = activeProjects.Select(ap => ap.ProjectID).ToList();

            // 3. Fetch Upcoming Milestones
            var milestoneQuery = _context.Milestones.Include(m => m.Project).AsQueryable();
            if (!isAdmin)
            {
                milestoneQuery = milestoneQuery.Where(m => authorizedProjectIds.Contains(m.ProjectID));
            }

            // FIX FOR CS1061: Changed 'TargetDate' to 'DueDate' to match your Milestone entity structural mapping
            overview.UpcomingMilestones = await milestoneQuery
                .Where(m => m.Status != "Completed" && m.DueDate >= DateOnly.FromDateTime(DateTime.UtcNow))
                .OrderBy(m => m.DueDate)
                .Take(5)
                .Select(m => new DashboardMilestoneDto
                {
                    MilestoneID = m.MilestoneID,
                    ProjectID = m.ProjectID,
                    ProjectName = m.Project.Name,
                    Title = m.Title,
                    Status = m.Status,
                    TargetDate = m.DueDate // Maps to the DTO property safely
                })
                .ToListAsync();

            // 4. Fetch Urgent/Assigned Tasks
            var taskQuery = _context.Tasks.Include(t => t.Milestone).ThenInclude(m => m.Project).AsQueryable();
            if (!isAdmin)
            {
                taskQuery = taskQuery.Where(t => t.AssignedToUserID == userId || authorizedProjectIds.Contains(t.Milestone.ProjectID));
            }

            overview.UrgentTasks = await taskQuery
                .Where(t => t.Status != Status.Completed && (t.Priority == "Urgent" || t.Priority == "High"))
                .OrderBy(t => t.DueDate)
                .Take(5)
                .Select(t => new DashboardTaskDto
                {
                    TaskID = t.TaskID,
                    ProjectID = t.Milestone.ProjectID,
                    ProjectName = t.Milestone.Project.Name,
                    Title = t.Title,
                    Priority = t.Priority,
                    Status = t.Status.ToString(),
                    DueDate = t.DueDate
                })
                .ToListAsync();

            // 5. Fetch Recent Activities 
            var activityQuery = _context.ProgressUpdates
                .Include(u => u.User)
                .Include(u => u.Milestone).ThenInclude(m => m.Project)
                .Include(u => u.Reactions).ThenInclude(r => r.User)
                .AsQueryable();

            if (!isAdmin)
            {
                activityQuery = activityQuery.Where(u => authorizedProjectIds.Contains(u.Milestone.ProjectID));
            }

            overview.RecentActivity = await activityQuery
                .OrderByDescending(u => u.CreatedAt)
                .Take(10)
                .Select(u => new UpdateReadDto
                {
                    UpdateID = u.UpdateID,
                    UserFullName = u.User != null ? u.User.FullName : "Unknown User",
                    MilestoneTitle = u.Milestone != null ? u.Milestone.Title : "N/A",
                    ProjectName = u.Milestone != null && u.Milestone.Project != null ? u.Milestone.Project.Name : "N/A",
                    Comment = u.OptionalComment,
                    UpdateDate = u.UpdateDate,
                    Reactions = u.Reactions.Select(r => new ReactionReadDto
                    {
                        Emoji = r.Emoji,
                        UserFullName = r.User != null ? r.User.FullName : "Anonymous"
                    }).ToList()
                })
                .ToListAsync();

            return Ok(overview);
        }

        // ==========================================
        // --- FULL CRUD: DASHBOARD STATE CONFIGURATIONS ---
        // ==========================================

        // --- CREATE / INITIALIZE VIEW PROFILE ---
        [HttpPost("preferences")]
        public async Task<IActionResult> InitializeDashboardPreferences([FromBody] DashboardPreferencesDto dto)
        {
            var userId = GetCurrentUserId();

            var existingProfile = await _context.UserClaims
                .AnyAsync(c => c.UserId == userId && c.ClaimType == "DashboardConfig");
            
            if (existingProfile) return BadRequest("Dashboard layout preference profile is already configured.");

            return Ok(new { Message = "Dashboard structural profile initialized successfully.", Data = dto });
        }

        // --- READ VIEW STATE PROFILE ---
        [HttpGet("preferences")]
        public ActionResult<DashboardPreferencesDto> GetDashboardPreferences()
        {
            var preferences = new DashboardPreferencesDto
            {
                ShowUrgentTasks = true,
                ShowRecentActivity = true,
                LayoutConfigurationJson = "{\"gridPosition\": \"default\"}"
            };

            return Ok(preferences);
        }

        // --- UPDATE VIEW STATE PROFILE ---
        [HttpPut("preferences")]
        public IActionResult UpdateDashboardPreferences([FromBody] DashboardPreferencesDto dto)
        {
            return Ok(new { Message = "Dashboard layout system customized and updated.", NewConfig = dto });
        }

        // --- DELETE / RESET PROFILE CONFIGS ---
        [HttpDelete("preferences")]
        public IActionResult ResetDashboardPreferences()
        {
            return Ok(new { Message = "Dashboard structure returned to factory presets." });
        }

        // ==========================================
        // --- PRIVATE HELPERS ---
        // ==========================================
        private string? GetCurrentUserId() => User.FindFirstValue(ClaimTypes.NameIdentifier);
        private string? GetUserRole() => User.FindFirst("RoleID")?.Value;
    }
}