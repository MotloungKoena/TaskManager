using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using TaskManager.API.Models;

namespace TaskManager.API.Data
{
    public class ApplicationDbContext : IdentityDbContext<ApplicationUser>
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options)
        {
        }

        public DbSet<Project> Projects { get; set; }
        public DbSet<ProjectMember> ProjectMembers { get; set; }
        public DbSet<ProjectTask> Tasks { get; set; }   
        public DbSet<ChatMessage> ChatMessages { get; set; }
        public DbSet<MessageReadReceipt> MessageReadReceipts { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // ProjectMember composite key
            modelBuilder.Entity<ProjectMember>()
                .HasKey(pm => new { pm.ProjectId, pm.UserId });

            // ProjectMember relationships
            modelBuilder.Entity<ProjectMember>()
                .HasOne(pm => pm.Project)
                .WithMany(p => p.Members)
                .HasForeignKey(pm => pm.ProjectId);

            modelBuilder.Entity<ProjectMember>()
                .HasOne(pm => pm.User)
                .WithMany(u => u.ProjectMembers)
                .HasForeignKey(pm => pm.UserId);

            // ProjectTask relationships  
            modelBuilder.Entity<ProjectTask>()
                .HasOne(t => t.Project)
                .WithMany(p => p.Tasks)
                .HasForeignKey(t => t.ProjectId);

            modelBuilder.Entity<ProjectTask>()
                .HasOne(t => t.AssignedTo)
                .WithMany(u => u.AssignedTasks)
                .HasForeignKey(t => t.AssignedToId)
                .OnDelete(DeleteBehavior.SetNull);

            // ChatMessage relationships
            modelBuilder.Entity<ChatMessage>()
                .HasOne(cm => cm.Project)
                .WithMany(p => p.ChatMessages)
                .HasForeignKey(cm => cm.ProjectId);

            modelBuilder.Entity<ChatMessage>()
                .HasOne(cm => cm.Sender)
                .WithMany(u => u.Messages)
                .HasForeignKey(cm => cm.SenderId)
                .OnDelete(DeleteBehavior.Restrict);

            // MessageReadReceipt relationships
            modelBuilder.Entity<MessageReadReceipt>()
                .HasKey(mrr => new { mrr.MessageId, mrr.UserId });

            modelBuilder.Entity<MessageReadReceipt>()
                .HasOne(mrr => mrr.Message)
                .WithMany(m => m.ReadReceipts)
                .HasForeignKey(mrr => mrr.MessageId);

            modelBuilder.Entity<MessageReadReceipt>()
                .HasOne(mrr => mrr.User)
                .WithMany(u => u.ReadReceipts)
                .HasForeignKey(mrr => mrr.UserId);
        }
    }
}