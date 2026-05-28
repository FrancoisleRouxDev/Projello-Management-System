namespace Projello.Api.Models;

public class CreateUpdateDto
{
    public string? Caption { get; set; }
    public IFormFile? Image { get; set; }
}

public class ReactDto
{
    public string Emoji { get; set; } = string.Empty;
}

public class CommentDto
{
    public string CommentText { get; set; } = string.Empty;
}