using System.ComponentModel.DataAnnotations;

namespace Projello.Api.DTOs
{
    public class MilestoneCreateDto
    {
        [Required]
        public int ProjectID { get; set; }

        [Required]
        [MaxLength(255)]
        public string Title { get; set; } = null!;

        public string? Description { get; set; }

        public DateOnly? DueDate { get; set; }
    }
}