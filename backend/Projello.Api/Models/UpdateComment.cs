namespace Projello.Api.Models;

public class UpdateComment
{
    public int Id { get; set; }

    public int UpdateId { get; set; }          // Which update this comment belongs to

    public string UserId { get; set; } = string.Empty;

    public string CommentText { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}