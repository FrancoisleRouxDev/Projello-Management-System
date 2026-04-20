namespace Projello.Api.DTOs
{
    public class UserDisplayDto
    {
        public string Id { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public int RoleID { get; set; }
        public bool IsTwoFactorEnabled { get; set; }
    }
}