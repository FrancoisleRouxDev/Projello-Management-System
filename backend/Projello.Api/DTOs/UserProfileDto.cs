namespace Projello.Api.DTOs
{
    public class UserProfileDto
    {
        public string Id { get; set; } = null!;
        public string FullName { get; set; } = null!;
        public string Email { get; set; } = null!;
        public int RoleID { get; set; }
        public List<UserProjectDto> Projects { get; set; } = new();
        public List<UserTaskDto> AssignedTasks { get; set; } = new();
    }

    public class UserProjectDto
    {
        public int ProjectID { get; set; }
        public string Name { get; set; } = null!;
        public string RoleInProject { get; set; } = null!; // e.g., "Foreman"
    }

    public class UserTaskDto
    {
        public int TaskID { get; set; }
        public string Title { get; set; } = null!;
        public string Status { get; set; } = null!;
        public DateOnly? DueDate { get; set; }
    }

    public class UserWorkloadDto
{
    public int OpenTasks { get; set; }
    public int CompletedTasks { get; set; }
    public int BlockedTasks { get; set; }
}
}