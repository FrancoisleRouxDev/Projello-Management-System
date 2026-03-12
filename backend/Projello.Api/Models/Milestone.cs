using System.ComponentModel.DataAnnotations;

namespace Projello.Api.Models;

public class Milestone
{
    public int MilestoneID { get; set; }

    [Required]
    public int ProjectID { get; set; }

    [Required]
    [MaxLength(255)]
    public string Title { get; set; } = null!;

    public string? Description { get; set; }
    public DateOnly? DueDate { get; set; }

    [MaxLength(20)]
    public string Status { get; set; } = "NotStarted";

    public DateOnly? CompletedDate { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Project Project { get; set; } = null!;
    public ICollection<TaskItem> Tasks { get; set; } = new List<TaskItem>();
    public ICollection<ProgressUpdate> ProgressUpdates { get; set; } = new List<ProgressUpdate>();
    public ICollection<Attachment> Attachments { get; set; } = new List<Attachment>();
}