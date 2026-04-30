using System.ComponentModel.DataAnnotations;

namespace Projello.Api.DTOs
{
    public class ProgressUpdateCreateDto
    {
        [MaxLength(500)]
        public string? OptionalComment { get; set; }
    }
}