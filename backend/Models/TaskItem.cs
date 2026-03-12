using System.ComponentModel.DataAnnotations;

public class TaskItem
{
    [Key]
    public int TaskID { get; set; }
    public string MilestoneID { get; set; } //Foreign key from Milestone
    [Required, StringLength(255)]
    public string Title { get; set; }
    public string Description { get; set; }
    public int? AssignedToUserID { get; set; } // Assigned Worker
    public string Status { get; set; }
    public string Priority { get; set; }


}