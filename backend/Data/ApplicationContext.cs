using Microsoft.EntityFrameworkCore;
using Backend.Models;
using Backend.Data;

namespace Backend.Data;

public class ApplicationDbContext : ApplicationDbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options) { }

    public DbSet<Milestone> Milestones { get; set; }
    public DbSet<TaskItem> TaskItems { get; set; }
}
