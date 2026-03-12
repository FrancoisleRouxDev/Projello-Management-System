using System.ComponentModel.DataAnnotations;

namespace Projello.Api.Models;

public class ProjectMember
{
    [Key]
    public int ProjectMemberID { get; set; }
    [Required]
    public int ProjectID { get; set; }
    [Required]
    public string UserID { get; set; } = null!;
    [Required]
    [MaxLength(20)]
    public string AssignedAs { get; set; } = null!;
    public Project Project { get; set; } = null!;
    public User User { get; set; } = null!;
}