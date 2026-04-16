   using System.ComponentModel.DataAnnotations;

    namespace Projello.Api.DTOs;
    public class UserLoginDto
    {
        // Validates email format before hitting the database
        [Required]
        [EmailAddress]
        public string Email { get; set; } = null!;


        [Required]
        public string Password { get; set; } = null!;
    }