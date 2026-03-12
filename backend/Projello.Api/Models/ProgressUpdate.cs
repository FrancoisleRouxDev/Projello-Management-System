using System.ComponentModel.DataAnnotations;

namespace Projello.Api.Models;

public class ProgressUpdate
{
    public int UpdateID { get; set; }

    [Required]
    public int MilestoneID { get; set; }

    [Required]
    public string UserID { get; set; } = null!;

    public string? OptionalComment { get; set; }
    public DateOnly UpdateDate { get; set; } = DateOnly.FromDateTime(DateTime.UtcNow);
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Milestone Milestone { get; set; } = null!;
    public User User { get; set; } = null!;
    public ICollection<Reaction> Reactions { get; set; } = new List<Reaction>();
    public ICollection<Attachment> Attachments { get; set; } = new List<Attachment>();
}