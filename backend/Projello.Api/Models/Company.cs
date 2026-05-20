using System.ComponentModel.DataAnnotations;

namespace Projello.Api.Models;

public class Company
{
    [Key]
    public int CompanyID { get; set; }

    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    public string? Description { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Foreign key to User (Owner)
    public string? OwnerUserId { get; set; }

    // Navigation property
    public User? Owner { get; set; }
}