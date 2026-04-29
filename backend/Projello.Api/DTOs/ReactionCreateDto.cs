using System.ComponentModel.DataAnnotations;

namespace Projello.Api.DTOs
{
    public class ReactionCreateDto
    {
        [Required]
        public string Emoji { get; set; } = null!; // e.g., "👍"
    }
}