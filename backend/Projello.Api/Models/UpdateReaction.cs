namespace Projello.Api.Models;

public class UpdateReaction
{
    public int Id { get; set; }

    public int UpdateId { get; set; }     // Which update this reaction belongs to

    public string UserId { get; set; } = string.Empty;

    public string Emoji { get; set; } = string.Empty;   // e.g. "👍", "❤️", "😂"

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}