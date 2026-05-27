using Microsoft.AspNetCore.Identity;
using System.ComponentModel.DataAnnotations;

namespace Projello.Api.Models
{
    public class User : IdentityUser
    {
        [Required]
        [MaxLength(150)]
        public string FullName { get; set; } = string.Empty;

        [Required]
        public int RoleID { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public string? TwoFactorSecret { get; set; }
        public bool IsTwoFactorEnabled { get; set; } = false;

        public string AvatarSeed { get; set; } = string.Empty;

        public string AvatarBackground { get; set; } = string.Empty;

        //link user to company

        public int? CompanyId { get; set; }
        public Company? Company { get; set; }
    }
}