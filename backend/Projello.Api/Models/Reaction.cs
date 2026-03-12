using System.ComponentModel.DataAnnotations;

namespace Projello.Api.Models;

public class Reaction
{
    [Key]
    public int ReactionID { get; set; }
    [Required]
    public int UpdateID { get; set; }
    [Required]
    public string UserID { get; set; } = null!;
    [Required]
    [MaxLength(10)]
    public string Emoji { get; set; } = null!;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public ProgressUpdate ProgressUpdate { get; set; } = null!;
    public User User { get; set; } = null!;
}