using Microsoft.AspNetCore.Identity;
using System.ComponentModel.DataAnnotations;

namespace Projello.Api.Models
{
    public class User : IdentityUser
    {
        [Required] // Field must be provided
        [MaxLength(150)] // Limits string length to match DB column
        public string FullName { get; set; } = string.Empty;

        [Required]
        public int RoleID { get; set; } // Custom role field: 1 = Admin, 2 = Foreman, 3 = Worker
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow; // Auto-set on creation, UTC for timezone consistency
    }
}