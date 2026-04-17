using System.ComponentModel.DataAnnotations;

namespace Projello.Api.DTOs;

    public class UserReadDto
    {
        public string Id { get; set; } = null!;
        public string FullName { get; set; } = null!;
        public string Email { get; set; } = null!;
        public string Role { get; set; } = null!;
        public DateTime CreatedAt { get; set; }

        public bool isTwoFactorEnabled { get; set; } 

        public class VerifyTwoFactorDto
        {
            [Required]
            public string Email { get; set; } = null!;

            [Required]
            public string Code { get; set; } = null!;
        }
    }
 // previous version allowed you type 123 for example as a valid email. new version requires correct email format.