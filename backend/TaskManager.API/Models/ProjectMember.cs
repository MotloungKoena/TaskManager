namespace TaskManager.API.Models
{
    public class ProjectMember
    {
        public int ProjectId { get; set; }
        public string UserId { get; set; } = string.Empty;
        public string Role { get; set; } = "Member"; // Admin, Member, Viewer
        public DateTime JoinedAt { get; set; } = DateTime.UtcNow;

        // Navigation properties
        public Project? Project { get; set; }
        public ApplicationUser? User { get; set; }
    }
}