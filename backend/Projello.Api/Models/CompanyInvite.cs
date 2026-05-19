using System.ComponentModel.DataAnnotations;

namespace Projello.Api.Models;

public class CompanyInvite
{
    [Key]
    public int InviteID { get; set; }

    [Required]
    public string Code { get; set; } = string.Empty;

    public int CompanyID { get; set; }
    public Company? Company { get; set; }

    public string CreatedByUserId { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime ExpiresAt { get; set; }

    public bool IsUsed { get; set; } = false;
    public string? UsedByUserId { get; set; }
    public DateTime? UsedAt { get; set; }
}