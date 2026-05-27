using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Projello.Api.Data;
using Projello.Api.Models;
using CloudinaryDotNet;
using CloudinaryDotNet.Actions;

namespace Projello.Api.Controllers;

[ApiController]
[Route("api/projects/{projectId}/updates")]
[Authorize]
public class SiteUpdatesController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly Cloudinary _cloudinary;

    public SiteUpdatesController(AppDbContext context, Cloudinary cloudinary)
    {
        _context = context;
        _cloudinary = cloudinary;
    }

    // GET: Get all updates for a project
    [HttpGet]
    public async Task<IActionResult> GetUpdates(int projectId)
    {
        var updates = _context.ProjectUpdates
            .Where(u => u.ProjectId == projectId)
            .OrderByDescending(u => u.CreatedAt)
            .ToList();

        return Ok(updates);
    }

    // POST: Create new update (with image)
    [HttpPost]
    public async Task<IActionResult> CreateUpdate(int projectId, [FromForm] CreateUpdateDto dto)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (userId == null) return Unauthorized();

        string imageUrl = string.Empty;

        // Upload image to Cloudinary
        if (dto.Image != null)
        {
            using var stream = dto.Image.OpenReadStream();
            var uploadParams = new ImageUploadParams
            {
                File = new FileDescription(dto.Image.FileName, stream),
                Folder = "projello/site-updates"
            };

            var uploadResult = await _cloudinary.UploadAsync(uploadParams);
            imageUrl = uploadResult.SecureUrl.ToString();
        }

        var update = new ProjectUpdate
        {
            ProjectId = projectId,
            UserId = userId,
            Caption = dto.Caption,
            ImageUrl = imageUrl,
            CreatedAt = DateTime.UtcNow
        };

        _context.ProjectUpdates.Add(update);
        await _context.SaveChangesAsync();

        return Ok(update);
    }

    // POST: Add reaction to an update
    [HttpPost("{updateId}/react")]
    public async Task<IActionResult> React(int updateId, [FromBody] ReactDto dto)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (userId == null) return Unauthorized();

        var reaction = new UpdateReaction
        {
            UpdateId = updateId,
            UserId = userId,
            Emoji = dto.Emoji,
            CreatedAt = DateTime.UtcNow
        };

        _context.UpdateReactions.Add(reaction);
        await _context.SaveChangesAsync();

        return Ok();
    }

    // POST: Add comment to an update
    [HttpPost("{updateId}/comments")]
    public async Task<IActionResult> AddComment(int updateId, [FromBody] CommentDto dto)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (userId == null) return Unauthorized();

        var comment = new UpdateComment
        {
            UpdateId = updateId,
            UserId = userId,
            CommentText = dto.CommentText,
            CreatedAt = DateTime.UtcNow
        };

        _context.UpdateComments.Add(comment);
        await _context.SaveChangesAsync();

        return Ok(comment);
    }
}