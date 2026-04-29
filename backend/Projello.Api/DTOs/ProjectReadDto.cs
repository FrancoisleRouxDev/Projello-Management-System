namespace Projello.Api.DTOs
{
    public class ProjectReadDto
    {
        public int ProjectID { get; set; }
        public string Name { get; set; } = null!;
        public string? Description { get; set; }
        public string Status { get; set; } = null!;
        public DateOnly? DueDate { get; set; }
        public DateTime CreatedAt { get; set; }
        
        // Flattened or simplified Client info
        public int ClientID { get; set; }
        public string ClientName { get; set; } = null!;
        public bool IsClientBlacklisted { get; set; }
    }
}