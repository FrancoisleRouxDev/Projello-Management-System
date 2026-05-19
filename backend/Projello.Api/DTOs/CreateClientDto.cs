using System.ComponentModel.DataAnnotations;

namespace Projello.Api.DTOs;

public class CreateClientDto
{
    [Required]
    [MaxLength(150)]
    public string Name { get; set; } = null!;

    [MaxLength(255)]
    public string? ContactEmail { get; set; }

    [MaxLength(30)]
    public string? ContactPhone { get; set; }

    public string? Notes { get; set; }
}