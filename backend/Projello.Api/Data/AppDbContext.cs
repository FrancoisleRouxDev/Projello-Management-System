using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Projello.Api.Models;

namespace Projello.Api.Data
{
    // They cannot be found until code is added in the Models folder for it.
    public class AppDbContext : IdentityDbContext<User>// Base class for Identity tables + custom User
{
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) 
            : base(options) { }// Injects DB connection from Program.cs

        public DbSet<Project> Projects { get; set; } = null!;// Defines tables for EF queries
        public DbSet<Milestone> Milestones { get; set; } = null!;
        public DbSet<TaskItem> Tasks { get; set; } = null!;
        public DbSet<Client> Clients { get; set; } = null!;
        public DbSet<ProjectMember> ProjectMembers { get; set; } = null!;
        public DbSet<ProgressUpdate> ProgressUpdates { get; set; } = null!;
        public DbSet<Reaction> Reactions { get; set; } = null!;
        public DbSet<Attachment> Attachments { get; set; } = null!;



//Section below is extra rule for the database, This one is so no client can be blacklisted by default, they have to be manually blacklisted by an admin.
        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);
            
            builder.Entity<Client>()
                .Property(c => c.IsBlacklisted)
                .HasDefaultValue(false);
        }
    }
}