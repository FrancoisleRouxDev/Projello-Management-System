using System.ComponentModel.DataAnnotations;

namespace Projello.Api.DTOs;

public class ClientUpdateDto
{
    [Range(0, double.MaxValue)]
    public decimal? TotalPaid { get; set; }

    [Range(0, double.MaxValue)]
    public decimal? Outstanding { get; set; }

    [MaxLength(50)]
    public string? Status { get; set; }
}