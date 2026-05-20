namespace Projello.Api.DTOs;

public class AddProjectMemberDto
{
    public string UserID { get; set; } = string.Empty;
    public string? AssignedAs { get; set; }  // "Worker", "Foreman", etc.
}