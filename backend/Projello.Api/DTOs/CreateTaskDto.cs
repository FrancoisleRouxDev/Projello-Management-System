using System.ComponentModel.DataAnnotations;

namespace Projello.Api.DTOs;

public class CreateTaskDto
{
    [Required]
    public int MilestoneId { get; set; }

    [Required]
    public string Title { get; set; } = string.Empty;

    public string? Description { get; set; }

    public int? AssignedToUserId { get; set; }

    public string Priority { get; set; } = "Normal";

    public string Status { get; set; } = "Pending";
}