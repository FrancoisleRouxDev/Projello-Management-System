using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Projello.Api.Models;

namespace Projello.Api.Data
{
    // They cannot be found until code is added in the Models folder for it.
    public class AppDbContext : IdentityDbContext<User>
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) 
            : base(options) { }

        public DbSet<Project> Projects { get; set; } = null!;
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

    // No client is blacklisted by default
    builder.Entity<Client>()
        .Property(c => c.IsBlacklisted)
        .HasDefaultValue(false);

    // Correct relationship configuration
    builder.Entity<Client>()
        .HasOne(c => c.BlacklistedBy)           // Navigation property (User)
        .WithMany()                             // Admin can blacklist many clients
        .HasForeignKey(c => c.BlacklistedById)  // The FK property (string)
        .OnDelete(DeleteBehavior.SetNull);      // If admin is deleted, keep the client record
}
}
}