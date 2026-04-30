namespace Projello.Api.DTOs
{
    public class TaskStatusUpdateDto
    {
        // Acceptable values: NotStarted, InProgress, Completed, Blocked
        public string Status { get; set; } = null!;
    }
}