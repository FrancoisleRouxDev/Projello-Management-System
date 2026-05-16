using System;
using System.Collections.Generic;

namespace Projello.Api.DTOs
{
    // High-performance payload for the initial load
    public class DashboardOverviewDto
    {
        public List<DashboardProjectDto> ActiveProjects { get; set; } = new();
        public List<DashboardMilestoneDto> UpcomingMilestones { get; set; } = new();
        public List<DashboardTaskDto> UrgentTasks { get; set; } = new();
        public List<UpdateReadDto> RecentActivity { get; set; } = new();
    }

    public class DashboardProjectDto
    {
        public int ProjectID { get; set; }
        public string Name { get; set; } = null!;
        public string Status { get; set; } = null!;
        public DateOnly? DueDate { get; set; }
        public string ClientName { get; set; } = null!;
        public int TotalTasksCount { get; set; }
        public int CompletedTasksCount { get; set; }
    }

    public class DashboardMilestoneDto
    {
        public int MilestoneID { get; set; }
        public int ProjectID { get; set; }
        public string ProjectName { get; set; } = null!;
        public string Title { get; set; } = null!;
        public string Status { get; set; } = null!;
        public DateOnly? TargetDate { get; set; }
    }

    public class DashboardTaskDto
    {
        public int TaskID { get; set; }
        public int ProjectID { get; set; }
        public string ProjectName { get; set; } = null!;
        public string Title { get; set; } = null!;
        public string Priority { get; set; } = null!;
        public string Status { get; set; } = null!;
        public DateOnly? DueDate { get; set; }
    }

    // Pinned widget preference state management (For CRUD operations)
    public class DashboardPreferencesDto
    {
        public bool ShowUrgentTasks { get; set; } = true;
        public bool ShowRecentActivity { get; set; } = true;
        public string LayoutConfigurationJson { get; set; } = "{}";
    }
}