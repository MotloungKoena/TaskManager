namespace TaskManager.API.Models
{
    public class MessageReadReceipt
    {
        public int MessageId { get; set; }
        public string UserId { get; set; } = string.Empty;
        public DateTime ReadAt { get; set; } = DateTime.UtcNow;

        // Navigation properties
        public ChatMessage? Message { get; set; }
        public ApplicationUser? User { get; set; }
    }
}