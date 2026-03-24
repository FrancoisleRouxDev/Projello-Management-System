using Microsoft.AspNetCore.Identity;
using System.ComponentModel.DataAnnotations;

namespace Projello.Api.Models
{
    public class User : IdentityUser
    {
        [Required]// Validation: Field must be provided
        [MaxLength(150)]// DB constraint: Limits string length
        public string FullName { get; set; } = string.Empty;

        [Required]
        public int RoleID { get; set; }; // Custom field for user roles (e.g., admin, member)
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;// Auto-sets creation timestamp UCT time for consistency across time zones
    }
}