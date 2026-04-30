using System.ComponentModel.DataAnnotations;

namespace Projello.Api.DTOs
{
    public class TaskCreateDto
    {
        [Required]
        public int MilestoneID { get; set; }

        [Required]
        [MaxLength(255)]
        public string Title { get; set; } = null!;

        public string? Description { get; set; }

        public string? AssignedToUserID { get; set; }

        public DateOnly? DueDate { get; set; }

        public string Priority { get; set; } = "Medium";
    }
}