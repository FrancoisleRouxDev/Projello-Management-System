namespace Projello.Api.DTOs
{
    public class UserRegisterDto
    {
        public string FullName { get; set; } = null!;

        // Validates email format before hitting the database
        [Required]
        [EmailAddress]
        [MaxLength(256)]
        public string Email { get; set; } = null!;

        public string Password { get; set; } = null!;
        public int RoleID { get; set; }
    }

    public class UserLoginDto
    {
        // Validates email format before hitting the database
        [Required]
        [EmailAddress]
        public string Email { get; set; } = null!;

        public string Password { get; set; } = null!;
    }

    public class UserReadDto
    {
        public string Id { get; set; } = null!;
        public string FullName { get; set; } = null!;
        public string Email { get; set; } = null!;
        public string Role { get; set; } = null!;
        public DateTime CreatedAt { get; set; }
    }
} // previous version allowed you type 123 for example as a valid email. new version requires correct email format.