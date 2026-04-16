using System.ComponentModel.DataAnnotations;

namespace Projello.Api.Models;

public class TaskItem
{
    [Key]
    public int TaskID { get; set; }

    [Required]
    public int MilestoneID { get; set; }

    [Required]
    [MaxLength(255)]
    public string Title { get; set; } = null!;

    public string? Description { get; set; }
    public string? AssignedToUserID { get; set; }
    public DateOnly? DueDate { get; set; }

    [MaxLength(20)]
    public Status Status { get; set; } = Status.NotStarted;


    [MaxLength(10)]
    public string Priority { get; set; } = "Medium";

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Milestone Milestone { get; set; } = null!;
    public User? AssignedTo { get; set; }
    public ICollection<Attachment> Attachments { get; set; } = new List<Attachment>();
}

public enum Status
{
    NotStarted,
    InProgress,
    Completed,
    Blocked
}