using System.ComponentModel.DataAnnotations;

namespace Projello.Api.Models;

public class Milestone
{
    [Key]
    public int MilestoneId { get; set; }

    [Required]
    public string Title { get; set; } = string.Empty;

    public string? Description { get; set; }

    public DateTime? DueDate { get; set; }

    public string Status { get; set; } = "Pending";

    public ICollection<TaskItem> Tasks { get; set; } = new List<TaskItem>();
}