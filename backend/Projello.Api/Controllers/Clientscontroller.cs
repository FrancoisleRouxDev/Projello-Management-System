using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Projello.Api.Data;
using Projello.Api.DTOs;
using Projello.Api.Models;
using System.Security.Claims;

namespace Projello.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize] // All endpoints require a valid JWT
    public class ClientsController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly UserManager<User> _userManager;

        public ClientsController(AppDbContext context, UserManager<User> userManager)
        {
            _context = context;
            _userManager = userManager;
        }

        // --- READ: GET ALL CLIENTS ---
        [HttpGet]
        public async Task<IActionResult> GetClients()
        {
            // Fetch from DB first (including the admin who blacklisted)
            var clients = await _context.Clients
                .Include(c => c.BlacklistedBy) // FIXED
                .ToListAsync();

            // Map in memory — avoids EF struggling to translate FullName in a Select projection
            var result = clients.Select(c => new ClientBlacklistStatusDto
            {
                ClientID          = c.ClientID,
                Name              = c.Name,
                IsBlacklisted     = c.IsBlacklisted,
                BlacklistReason   = IsAdmin() ? c.BlacklistReason : null,
                BlacklistedAt     = IsAdmin() ? c.BlacklistedAt : null,
                BlacklistedByName = IsAdmin() ? c.BlacklistedBy?.FullName : null // FIXED
            });

            return Ok(result);
        }

        // --- READ: GET SINGLE CLIENT ---
        [HttpGet("{id}")]
        public async Task<IActionResult> GetClient(int id)
        {
            var client = await _context.Clients
                .Include(c => c.BlacklistedBy) // FIXED
                .FirstOrDefaultAsync(c => c.ClientID == id);

            if (client == null) return NotFound(new { Message = "Client not found." });

            return Ok(new ClientBlacklistStatusDto
            {
                ClientID          = client.ClientID,
                Name              = client.Name,
                IsBlacklisted     = client.IsBlacklisted,
                BlacklistReason   = IsAdmin() ? client.BlacklistReason : null,
                BlacklistedAt     = IsAdmin() ? client.BlacklistedAt : null,
                BlacklistedByName = IsAdmin() ? client.BlacklistedBy?.FullName : null // FIXED
            });
        }

        // --- READ: GET ALL BLACKLISTED CLIENTS (Admin only) ---
        [HttpGet("blacklisted")]
        public async Task<IActionResult> GetBlacklistedClients()
        {
            if (!IsAdmin()) return Forbid();

            var blacklisted = await _context.Clients
                .Include(c => c.BlacklistedBy) // FIXED
                .Where(c => c.IsBlacklisted)
                .ToListAsync();

            var result = blacklisted.Select(c => new ClientBlacklistStatusDto
            {
                ClientID          = c.ClientID,
                Name              = c.Name,
                IsBlacklisted     = c.IsBlacklisted,
                BlacklistReason   = c.BlacklistReason,
                BlacklistedAt     = c.BlacklistedAt,
                BlacklistedByName = c.BlacklistedBy?.FullName // FIXED
            });

            return Ok(result);
        }

        // --- UPDATE: BLACKLIST A CLIENT (Admin only) ---
        // POST /api/clients/{id}/blacklist
        [HttpPost("{id}/blacklist")]
        public async Task<IActionResult> BlacklistClient(int id, [FromBody] BlacklistClientDto dto)
        {
            if (!IsAdmin()) return Forbid();

            var client = await _context.Clients.FindAsync(id);
            if (client == null) return NotFound(new { Message = "Client not found." });

            if (client.IsBlacklisted)
                return BadRequest(new { Message = $"{client.Name} is already blacklisted." });

            // Look up the admin doing the blacklisting
            var adminEmail = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var admin = await _userManager.FindByEmailAsync(adminEmail!);

            client.IsBlacklisted   = true;
            client.BlacklistReason = dto.Reason;
            client.BlacklistedAt   = DateTime.UtcNow;
            client.BlacklistedById = admin?.Id;

            await _context.SaveChangesAsync();

            return Ok(new
            {
                Message       = $"{client.Name} has been blacklisted.",
                Reason        = client.BlacklistReason,
                BlacklistedAt = client.BlacklistedAt,
                BlacklistedBy = admin?.FullName
            });
        }

        // --- UPDATE: REMOVE CLIENT FROM BLACKLIST (Admin only) ---
        // DELETE /api/clients/{id}/blacklist
        [HttpDelete("{id}/blacklist")]
        public async Task<IActionResult> RemoveFromBlacklist(int id)
        {
            if (!IsAdmin()) return Forbid();

            var client = await _context.Clients.FindAsync(id);
            if (client == null) return NotFound(new { Message = "Client not found." });

            if (!client.IsBlacklisted)
                return BadRequest(new { Message = $"{client.Name} is not currently blacklisted." });

            client.IsBlacklisted   = false;
            client.BlacklistReason = null;
            client.BlacklistedAt   = null;
            client.BlacklistedById = null;

            await _context.SaveChangesAsync();

            return Ok(new { Message = $"{client.Name} has been removed from the blacklist." });
        }

        // --- PRIVATE HELPERS ---

        private bool IsAdmin()
        {
            var roleClaim = User.FindFirst("RoleID")?.Value;
            return roleClaim == "1"; // 1 = Admin, 2 = Foreman, 3 = Worker
        }
    }
}