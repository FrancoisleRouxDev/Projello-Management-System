using System.ComponentModel.DataAnnotations;

namespace Projello.Api.DTOs;

public class Verify2FaDto
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = null!;

    [Required]
    public string Code { get; set; } = null!;
}