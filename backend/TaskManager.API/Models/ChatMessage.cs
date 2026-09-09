namespace TaskManager.API.Models
{
    public class ChatMessage
    {
        public int Id { get; set; }
        public int ProjectId { get; set; }
        public string SenderId { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public string MessageType { get; set; } = "Text"; // Text, File
        public string? FileUrl { get; set; }
        public DateTime SentAt { get; set; } = DateTime.UtcNow;
        public bool IsDeleted { get; set; } = false;

        // Navigation properties
        public Project? Project { get; set; }
        public ApplicationUser? Sender { get; set; }
        public ICollection<MessageReadReceipt> ReadReceipts { get; set; } = new List<MessageReadReceipt>();
    }
}