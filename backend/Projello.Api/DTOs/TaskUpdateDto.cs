using System.ComponentModel.DataAnnotations;
using Projello.Api.Models;

namespace Projello.Api.DTOs
{
    public class TaskUpdateDto
    {
        [Required(ErrorMessage = "Task title is required")]
        [MaxLength(255, ErrorMessage = "Title cannot exceed 255 characters")]
        public string Title { get; set; } = string.Empty;

        public string? Description { get; set; }

        [Required(ErrorMessage = "You must assign the task to a user")]
        public string AssignedToUserID { get; set; } = string.Empty;

        [Required(ErrorMessage = "Priority level is required")]
        public string Priority { get; set; } = "Medium"; // e.g., Low, Medium, High, Urgent

        public DateTime? DueDate { get; set; }
    }
}