namespace Projello.Api.DTOs
{
    public class MilestoneReadDto
    {
        public int MilestoneID { get; set; }
        public int ProjectID { get; set; }
        public string Title { get; set; } = null!;
        public string? Description { get; set; }
        public DateOnly? DueDate { get; set; }
        public string Status { get; set; } = null!;
        public DateOnly? CompletedDate { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}