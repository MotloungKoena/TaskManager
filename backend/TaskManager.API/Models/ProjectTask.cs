namespace TaskManager.API.Models
{
    public class ProjectTask
    {
        public int Id { get; set; }
        public int ProjectId { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string? AssignedToId { get; set; }
        public string? CreatedById { get; set; }
        public string Status { get; set; } = "Todo"; // Todo, InProgress, Review, Done
        public string Priority { get; set; } = "Medium"; // Low, Medium, High, Urgent
        public DateTime? DueDate { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }

        // Navigation properties
        public Project? Project { get; set; }
        public ApplicationUser? AssignedTo { get; set; }
        public ApplicationUser? CreatedBy { get; set; }
    }
}