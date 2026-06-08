using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Projello.Api.Data;
using Projello.Api.Models;
using CloudinaryDotNet;
using CloudinaryDotNet.Actions;

using Projello.Api.DTOs;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

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
        var updates = await _context.ProjectUpdates
            .Where(u => u.ProjectId == projectId)
            .OrderByDescending(u => u.CreatedAt)
            .ToListAsync();

        var updateIds = updates.Select(u => u.Id).ToList();

        var userIds = updates.Select(u => u.UserId)
            .Concat(await _context.UpdateReactions
                .Where(r => updateIds.Contains(r.UpdateId))
                .Select(r => r.UserId)
                .ToListAsync())
            .Concat(await _context.UpdateComments
                .Where(c => updateIds.Contains(c.UpdateId))
                .Select(c => c.UserId)
                .ToListAsync())
            .Distinct()
            .ToList();

        var userMap = await _context.Users
            .Where(u => userIds.Contains(u.Id))
            .Select(u => new { u.Id, u.FullName })
            .ToDictionaryAsync(x => x.Id, x => x.FullName);

        var reactions = await _context.UpdateReactions
            .Where(r => updateIds.Contains(r.UpdateId))
            .OrderBy(r => r.CreatedAt)
            .ToListAsync();

        var comments = await _context.UpdateComments
            .Where(c => updateIds.Contains(c.UpdateId))
            .OrderBy(c => c.CreatedAt)
            .ToListAsync();

        var payload = updates.Select(u => new ProjectDiscussionPostDto
        {
            Id = u.Id,
            ProjectId = u.ProjectId,
            UserId = u.UserId,
            UserFullName = userMap.TryGetValue(u.UserId, out var updateName) ? updateName : "Unknown user",
            Caption = u.Caption,
            ImageUrl = u.ImageUrl,
            CreatedAt = u.CreatedAt,
            Reactions = reactions
                .Where(r => r.UpdateId == u.Id)
                .Select(r => new ProjectDiscussionReactionDto
                {
                    Id = r.Id,
                    UserId = r.UserId,
                    UserFullName = userMap.TryGetValue(r.UserId, out var reactionName) ? reactionName : "Unknown user",
                    Emoji = r.Emoji,
                    CreatedAt = r.CreatedAt
                })
                .ToList(),
            Comments = comments
                .Where(c => c.UpdateId == u.Id)
                .Select(c => new ProjectDiscussionCommentDto
                {
                    Id = c.Id,
                    UserId = c.UserId,
                    UserFullName = userMap.TryGetValue(c.UserId, out var commentName) ? commentName : "Unknown user",
                    CommentText = c.CommentText,
                    CreatedAt = c.CreatedAt
                })
                .ToList()
        }).ToList();

        return Ok(payload);
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

        var existing = await _context.UpdateReactions
            .FirstOrDefaultAsync(r => r.UpdateId == updateId && r.UserId == userId && r.Emoji == dto.Emoji);

        if (existing != null)
        {
            _context.UpdateReactions.Remove(existing);
            await _context.SaveChangesAsync();
            return Ok(new { removed = true });
        }

        var reaction = new UpdateReaction
        {
            UpdateId = updateId,
            UserId = userId,
            Emoji = dto.Emoji,
            CreatedAt = DateTime.UtcNow
        };

        _context.UpdateReactions.Add(reaction);
        await _context.SaveChangesAsync();

        return Ok(new { removed = false });
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

    // DELETE entire post (image + caption + all comments)
    [HttpDelete("{updateId}")]
    public async Task<IActionResult> DeleteUpdate(int updateId)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (userId == null) return Unauthorized();

        var update = await _context.ProjectUpdates.FirstOrDefaultAsync(u => u.Id == updateId);
        if (update == null) return NotFound("Update not found.");

        // Authorization: Post owner OR Owner/Admin
        var role = User.FindFirst("RoleID")?.Value;
        bool isOwnerOrAdmin = role == "1" || role == "4";
        bool isPostAuthor = update.UserId == userId;

        if (!isPostAuthor && !isOwnerOrAdmin)
            return Forbid("You don't have permission to delete this post.");

        _context.ProjectUpdates.Remove(update);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    // DELETE single comment
    [HttpDelete("{updateId}/comments/{commentId}")]
    public async Task<IActionResult> DeleteComment(int updateId, int commentId)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (userId == null) return Unauthorized();

        var comment = await _context.UpdateComments
            .FirstOrDefaultAsync(c => c.Id == commentId && c.UpdateId == updateId);

        if (comment == null) return NotFound("Comment not found.");

        // Authorization: Comment owner OR Owner/Admin
        var role = User.FindFirst("RoleID")?.Value;
        bool isOwnerOrAdmin = role == "1" || role == "4";
        bool isCommentAuthor = comment.UserId == userId;

        if (!isCommentAuthor && !isOwnerOrAdmin)
            return Forbid("You can only delete your own comments.");

        _context.UpdateComments.Remove(comment);
        await _context.SaveChangesAsync();

        return NoContent();
    }
}