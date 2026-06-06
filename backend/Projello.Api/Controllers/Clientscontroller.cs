using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Projello.Api.Data;
using Projello.Api.DTOs;
using Projello.Api.Models;
using System.Data;
using System.Security.Claims;

namespace Projello.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class ClientsController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly UserManager<User> _userManager;

        public ClientsController(AppDbContext context, UserManager<User> userManager)
        {
            _context = context;
            _userManager = userManager;
        }

        // GET: api/clients
        
        [HttpGet]
        public async Task<IActionResult> GetClients()
        {
            var role = GetUserRole();
            var currentUser = await _userManager.FindByIdAsync(GetCurrentUserId()!);

            var query = _context.Clients
                .Include(c => c.BlacklistedBy)
                .AsQueryable();

            if (role != "1" && currentUser?.CompanyId != null)
            {
                query = query.Where(c => c.CompanyID == currentUser.CompanyId);
            }

            var clients = await query.ToListAsync();

            var result = new List<object>();
            foreach (var c in clients)
            {
                var activeProjects = await _context.Projects
                    .CountAsync(p => p.ClientID == c.ClientID && p.Status != "Completed");

                result.Add(new
                {
                    clientID = c.ClientID,
                    name = c.Name,
                    company = c.Company?.Name ?? "",
                    totalPaid = c.TotalPaid,
                    outstanding = c.Outstanding,
                    projects = $"{activeProjects} total",
                    activeProjects = $"{activeProjects} active",
                    status = c.Status,
                    isBlacklisted = c.IsBlacklisted
                });
            }

            return Ok(result);
        }

        // GET: api/clients/{id}
        [HttpGet("{id}")]
        public async Task<IActionResult> GetClient(int id)
        {
            var role = GetUserRole();
            var currentUser = await _userManager.FindByIdAsync(GetCurrentUserId()!);

            var client = await _context.Clients
                .Include(c => c.BlacklistedBy)
                .FirstOrDefaultAsync(c => c.ClientID == id);

            if (client == null) return NotFound();

            if (role == "4" && client.CompanyID != currentUser?.CompanyId)
                return Forbid();

            var activeProjects = await _context.Projects
                .CountAsync(p => p.ClientID == client.ClientID && p.Status != "Completed");

            return Ok(new
            {
                clientID = client.ClientID,
                name = client.Name,
                company = client.Company?.Name ?? "",
                totalPaid = client.TotalPaid,
                outstanding = client.Outstanding,
                projects = $"{activeProjects} total",
                activeProjects = $"{activeProjects} active",
                status = client.Status,
                isBlacklisted = client.IsBlacklisted
            });
        }

        // POST: api/clients
        [HttpPost]
        public async Task<IActionResult> CreateClient([FromBody] CreateClientDto dto)
        {
            var role = GetUserRole();
            if (role != "1" && role != "4") return Forbid();

            var currentUser = await _userManager.FindByIdAsync(GetCurrentUserId()!);
            if (currentUser?.CompanyId == null)
                return BadRequest(new { Message = "You must belong to a company." });

            // Prevent duplicate client names in the same company
            bool exists = await _context.Clients.AnyAsync(c =>
                c.CompanyID == currentUser.CompanyId &&
                c.Name.ToLower() == dto.Name.ToLower());

            if (exists)
                return BadRequest(new { Message = "A client with this name already exists in your company." });

            var client = new Client
            {
                Name = dto.Name,
                ContactEmail = dto.ContactEmail,
                ContactPhone = dto.ContactPhone,
                Notes = dto.Notes,
                CompanyID = currentUser.CompanyId.Value
            };

            _context.Clients.Add(client);
            await _context.SaveChangesAsync();

            return Ok(new { Message = "Client created successfully.", ClientID = client.ClientID });
        }

        // Update Client financials and status (without blacklisting)
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateClient(int id, [FromBody] ClientUpdateDto dto)
        {
            var role = GetUserRole();
            if (role != "1" && role != "4") return Forbid();

            var client = await _context.Clients.FindAsync(id);
            if (client == null) return NotFound();

            var currentUser = await _userManager.FindByIdAsync(GetCurrentUserId()!);
            if (role == "4" && client.CompanyID != currentUser?.CompanyId)
                return Forbid();

            if (dto.TotalPaid.HasValue)
                client.TotalPaid = dto.TotalPaid.Value;

            if (dto.Outstanding.HasValue)
                client.Outstanding = dto.Outstanding.Value;

            if (!string.IsNullOrWhiteSpace(dto.Status))
            {
                // Prevent setting Blacklisted status through this endpoint
                // (Blacklisting has its own dedicated feature)
                if (dto.Status.Trim().Equals("Blacklisted", StringComparison.OrdinalIgnoreCase))
                {
                    return BadRequest(new { Message = "Use the dedicated blacklist feature to blacklist a client." });
                }

                client.Status = dto.Status.Trim();
            }

            await _context.SaveChangesAsync();

            return Ok(new { Message = "Client updated successfully." });
        }
        // 

        // Blacklist
        [HttpPost("{id}/blacklist")]
        public async Task<IActionResult> BlacklistClient(int id, [FromBody] BlacklistClientDto dto)
        {
            var role = GetUserRole();
            if (role != "1" && role != "4") return Forbid();

            var client = await _context.Clients.FindAsync(id);
            if (client == null) return NotFound();

            var currentUser = await _userManager.FindByIdAsync(GetCurrentUserId()!);

            if (role == "4" && client.CompanyID != currentUser?.CompanyId)
                return Forbid();

            if (client.IsBlacklisted)
                return BadRequest(new { Message = "Client is already blacklisted." });

            client.IsBlacklisted = true;
            client.BlacklistReason = dto.Reason;
            client.BlacklistedAt = DateTime.UtcNow;
            client.BlacklistedById = GetCurrentUserId();

            await _context.SaveChangesAsync();

            return Ok(new { Message = $"{client.Name} has been blacklisted." });
        }

        // Remove from Blacklist
        [HttpDelete("{id}/blacklist")]
        public async Task<IActionResult> RemoveFromBlacklist(int id)
        {
            var role = GetUserRole();
            if (role != "1" && role != "4") return Forbid();

            var client = await _context.Clients.FindAsync(id);
            if (client == null) return NotFound();

            var currentUser = await _userManager.FindByIdAsync(GetCurrentUserId()!);

            if (role == "4" && client.CompanyID != currentUser?.CompanyId)
                return Forbid();

            if (!client.IsBlacklisted)
                return BadRequest(new { Message = "Client is not blacklisted." });

            client.IsBlacklisted = false;
            client.BlacklistReason = null;
            client.BlacklistedAt = null;
            client.BlacklistedById = null;

            await _context.SaveChangesAsync();

            return Ok(new { Message = $"{client.Name} has been removed from the blacklist." });
        }

        // helpers
        private string? GetCurrentUserId() => User.FindFirstValue(ClaimTypes.NameIdentifier);
        private string? GetUserRole() => User.FindFirst("RoleID")?.Value;
    
// Testing this method, that why its to the left and not aligned with the rest of the code
//GET: api/clients/summary
[HttpGet("summary")]
public async Task<ActionResult<ClientSummaryDto>> GetClientSummary()
{
    var role = GetUserRole();
    var currentUser = await _userManager.FindByIdAsync(GetCurrentUserId()!);

    var query = _context.Clients.AsQueryable();

    // Keep scoping aligned with existing GetClients behavior
    if (role != "1" && currentUser?.CompanyId != null)
    {
        query = query.Where(c => c.CompanyID == currentUser.CompanyId);
    }

    var blacklistedClients = await query.CountAsync(c => c.IsBlacklisted);
    var activeClients = await query.CountAsync(c => !c.IsBlacklisted);

    var summary = new ClientSummaryDto
    {
        // Keep null until a verified finance source is available
        TotalRevenue = null,
        Outstanding = null,
        ActiveClients = activeClients,
        BlacklistClients = blacklistedClients
    };

    return Ok(summary);
}
    
    }
    
}