using System;

namespace Projello.Api.DTOs;

public class UserReadDto
{
    public string Id { get; set; } = null!;
    public string FullName { get; set; } = null!;
    public string Email { get; set; } = null!;
    public string Role { get; set; } = null!;
    public DateTime CreatedAt { get; set; }

    public bool IsTwoFactorEnabled { get; set; } 
}