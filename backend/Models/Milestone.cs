using System.ComponentModel.DataAnnotations;

namespace backend.Models;

public class Milestone
{
    [Key]
    public int MilestoneId { get; set; }
    public int ProjectId {get; set; }

    [Required]
    public string Title { get; set; }
    public string Description { get; set; }
    public DateTime? DueDate { get; set; }
    public string Status { get; set; }

    [cite_start]
    public ICollection<TaskItem> Tasks { get; set; }
}