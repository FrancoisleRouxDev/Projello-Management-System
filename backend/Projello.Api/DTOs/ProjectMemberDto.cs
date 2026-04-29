namespace Projello.Api.DTOs
{
    public class ProjectMemberDto
    {
        public string UserID { get; set; } = null!;
        public string FullName { get; set; } = null!;
        public string AssignedAs { get; set; } = null!; // e.g., "Foreman" or "Worker"
    }
}