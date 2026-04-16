using System.ComponentModel.DataAnnotations;

namespace Projello.Api.DTOs;

    public class UserReadDto
    {
        public string Id { get; set; } = null!;
        public string FullName { get; set; } = null!;
        public string Email { get; set; } = null!;
        public string Role { get; set; } = null!;
        public DateTime CreatedAt { get; set; }
    }
 // previous version allowed you type 123 for example as a valid email. new version requires correct email format.