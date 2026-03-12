using System.ComponentModel.DataAnnotations;

namespace Projello.Api.Models;

public class Attachment
{
    [Key]
    public int AttachmentID { get; set; }
    public int? MilestoneID { get; set; }
    public int? TaskID { get; set; }
    public int? UpdateID { get; set; }
    [Required]
    [MaxLength(255)]
    public string FileName { get; set; } = null!;
    [Required]
    [MaxLength(500)]
    public string FileURL { get; set; } = null!;
    [MaxLength(100)]
    public string? FileType { get; set; }
    public int? SizeBytes { get; set; }
    [Required]
    public string UploadedByUserID { get; set; } = null!;
    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
    public Milestone? Milestone { get; set; }
    public TaskItem? Task { get; set; }
    public ProgressUpdate? ProgressUpdate { get; set; }
    public User UploadedBy { get; set; } = null!;
}