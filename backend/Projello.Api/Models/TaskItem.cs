using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Projello.Api.Models;

public class TaskItem
{
    [Key]
    public int TaskId { get; set; }

    [Required]
    public int MilestoneId { get; set; }

    [ForeignKey(nameof(MilestoneId))]
    public Milestone? Milestone { get; set; }

    [Required]
    [StringLength(255)]
    public string Title { get; set; } = string.Empty;

    public string? Description { get; set; }

    public int? AssignedToUserId { get; set; }

    public string Status { get; set; } = "Pending";

    public string Priority { get; set; } = "Normal";
}