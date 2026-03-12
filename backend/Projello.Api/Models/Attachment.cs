using System.ComponentModel.DataAnnotations;

namespace Projello.Api.Models
{
    public class Attachment
    {
        [Key]
        public int AttachmentID { get; set; }

        [Required]
        public int TaskID { get; set; }

        [Required]
        public string FileUrl { get; set; } = null!;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}