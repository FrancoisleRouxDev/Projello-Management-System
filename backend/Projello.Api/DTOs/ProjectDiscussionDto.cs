namespace Projello.Api.DTOs;

public class ProjectDiscussionPostDto
{
    public int Id { get; set; }
    public int ProjectId { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string UserFullName { get; set; } = string.Empty;
    public string? Caption { get; set; }
    public string ImageUrl { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }

    public List<ProjectDiscussionReactionDto> Reactions { get; set; } = new();
    public List<ProjectDiscussionCommentDto> Comments { get; set; } = new();
}

public class ProjectDiscussionReactionDto
{
    public int Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string UserFullName { get; set; } = string.Empty;
    public string Emoji { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}

public class ProjectDiscussionCommentDto
{
    public int Id { get; set; }
    public int DiscussionId { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string UserFullName { get; set; } = string.Empty;
    public string CommentText { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}