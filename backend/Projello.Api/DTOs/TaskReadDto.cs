namespace Projello.Api.DTOs
{
    public class TaskReadDto
    {
        public int TaskID { get; set; }
        public int MilestoneID { get; set; }
        public string MilestoneTitle { get; set; } = null!;
        public string Title { get; set; } = null!;
        public string? Description { get; set; }
        public string? AssignedToUserID { get; set; }
        public string? AssignedToFullName { get; set; }
        public string Status { get; set; } = null!;
        public string Priority { get; set; } = null!;
        public DateOnly? DueDate { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}