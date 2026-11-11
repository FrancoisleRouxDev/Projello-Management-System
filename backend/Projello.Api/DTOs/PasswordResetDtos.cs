using System.ComponentModel.DataAnnotations;

namespace Projello.Api.DTOs;

/// <summary>Requests a password reset email for an account.</summary>
public sealed record PasswordResetRequest
{
    [Required, EmailAddress]
    public required string Email { get; init; }
}

/// <summary>Sets a new password using a one-time reset token.</summary>
public sealed record PasswordResetConfirmRequest
{
    [Required, EmailAddress]
    public required string Email { get; init; }

    [Required]
    public required string Token { get; init; }

    [Required, MinLength(8)]
    public required string NewPassword { get; init; }
}
