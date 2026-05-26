using System.ComponentModel.DataAnnotations;

namespace Projello.Api.Models;

public class ProjectUpdate
{
    public int Id { get; set; }

    public int ProjectId { get; set; }

    public string UserId { get; set; } = string.Empty;   // Who posted it

    public string? Caption { get; set; }                 // Short description

    public string ImageUrl { get; set; } = string.Empty; // Cloudinary URL

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}