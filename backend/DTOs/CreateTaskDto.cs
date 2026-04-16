namespace Backend.DTO;

public class CreateTaskDto
{
    public int MilestomeID { get; set; }
    public string Title { get; set; }
    public string Description { get; set; }
    public int? AssignedToUserID { get; set; }
    public string Priority { get; set; } // Matched "Priority" varchar(18) in ERD

}