using System.ComponentModel.DataAnnotations;

namespace Projello.Api.DTOs;

public class UserRegisterDto
{
    
        public string FullName { get; set; } = null!;

        // Validates email format before hitting the database
        [Required]
        [EmailAddress]
        [MaxLength(256)]
        public string Email { get; set; } = null!;
        

        [Required]
        [MinLength(8)]                    // You can add more password rules here if you want
        public string Password { get; set; } = null!;
        public int RoleID { get; set; }
    }
    
