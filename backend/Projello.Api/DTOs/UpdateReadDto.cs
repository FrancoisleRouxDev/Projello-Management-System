namespace Projello.Api.DTOs
{
    public class UpdateReadDto
    {
        public int UpdateID { get; set; }
        public string UserFullName { get; set; } = null!;
        public string MilestoneTitle { get; set; } = null!;
        public string ProjectName { get; set; } = null!;
        public string? Comment { get; set; }
        public DateOnly UpdateDate { get; set; } // Matches your Model's DateOnly type
        public List<ReactionReadDto> Reactions { get; set; } = new();
    }

    public class ReactionReadDto
    {
        public string Emoji { get; set; } = null!;
        public string UserFullName { get; set; } = null!;
    }
}