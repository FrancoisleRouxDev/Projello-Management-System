using System.ComponentModel.DataAnnotations;

namespace Projello.Api.DTOs
{
    public class ProjectUpdateDto
    {
        [Required(ErrorMessage = "Project name is required")]
        [MaxLength(200, ErrorMessage = "Project name cannot exceed 200 characters")]
        public string Name { get; set; } = string.Empty;

        public string? Description { get; set; }

        [Required(ErrorMessage = "A Client must be assigned to the project")]
        public int ClientID { get; set; }

        // Using nullable DateTime for safety; converts easily to DateOnly in the controller
        public DateTime? StartDate { get; set; }

        public DateTime? DueDate { get; set; }


        public string Status { get; set; } = "Planning";
        public decimal? TotalPaid { get; set; }
        public decimal? Outstanding { get; set; }
    }
}