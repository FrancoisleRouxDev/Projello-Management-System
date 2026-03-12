namespace Backend.DTOs;

public class CreateMilestoneDto
{
    public int ProjectID { get; set; }
    public string Title { get; set; }
    public string Desription { get; set; }
    public DateTime? DueDate { get; set; }
    
}