using System.ComponentModel.DataAnnotations;

namespace Projello.Api.Models;

public class Client
{
    [Key]
    public int ClientID { get; set; }
    
    [Required]
    [MaxLength(150)]
    public string Name { get; set; } = null!;
    
    [MaxLength(255)]
    public string? ContactEmail { get; set; }
    
    [MaxLength(30)]
    public string? ContactPhone { get; set; }
    
    public bool IsBlacklisted { get; set; } = false;
    
    public string? Notes { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    public ICollection<Project> Projects { get; set; } = new List<Project>();

    //Blacklisting field

    //reason for why the client is blacklisted, this is optional but can be helpful for admins to keep track of why a client was blacklisted. It has a max length of 500 characters to allow for detailed explanations if needed.
    [MaxLength(500)]
    public string? BlacklistReason { get; set; }

    // timestamp for when they were blacklisted 
    public DateTime? BlacklistedAt { get; set; }

    //The Identity user ID of the admin who blacklisted the client 
    public string? BlacklistedById { get; set; }

    // Navigation property to the admin user who blacklisted this client
    public User? BlacklistedBy { get; set; }
}