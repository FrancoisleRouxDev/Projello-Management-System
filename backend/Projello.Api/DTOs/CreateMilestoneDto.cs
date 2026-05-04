using System.ComponentModel.DataAnnotations;

namespace Projello.Api.DTOs;

public class CreateMilestoneDto
{
    [Required]
    public string Title { get; set; } = string.Empty;

    public string? Description { get; set; }

    public DateTime? DueDate { get; set; }

    public string Status { get; set; } = "Pending";
}