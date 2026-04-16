using System.ComponentModel.DataAnnotations;

namespace Projello.Api.DTOs;

public class Setup2FaDto
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = null!;
}