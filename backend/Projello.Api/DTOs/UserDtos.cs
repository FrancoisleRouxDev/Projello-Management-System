namespace Projello.Api.DTOs
{
    public class UserRegisterDto
    {
        public string FullName { get; set; } = null!;
        public string Email { get; set; } = null!;
        public string Password { get; set; } = null!;
        public int RoleID { get; set; }
    }

    public class UserLoginDto
    {
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
        
        // NEW: Let the frontend know if 2FA is currently turned on for this user
        public bool IsTwoFactorEnabled { get; set; }
    }

    // NEW: DTO for the second step of the login process
    public class Verify2FaDto
    {
        public string Email { get; set; } = null!;
        public string Code { get; set; } = null!;
    }
}