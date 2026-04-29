using System.ComponentModel.DataAnnotations;

namespace Projello.Api.DTOs
{
    public class ProjectCreateDto
    {
        [Required(ErrorMessage = "Project name is required")]
        [MaxLength(200)]
        public string Name { get; set; } = null!;

        [Required(ErrorMessage = "A valid Client must be associated with the project")]
        public int ClientID { get; set; }

        public string? Description { get; set; }

        public DateOnly? StartDate { get; set; }

        public DateOnly? DueDate { get; set; }
        
        // Note: Status is not here because it defaults to "Planning" upon creation
    }
}