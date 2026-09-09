using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using TaskManager.API.Data;
using TaskManager.API.Models;
using System.Security.Claims;

namespace TaskManager.API.Hubs
{
    [Authorize]
    public class ChatHub : Hub
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<ChatHub> _logger;
        private static readonly Dictionary<string, string> _userConnections = new();
        private static readonly Dictionary<string, HashSet<string>> _projectGroups = new();

        public ChatHub(ApplicationDbContext context, ILogger<ChatHub> logger)
        {
            _context = context;
            _logger = logger;
        }

        public override async Task OnConnectedAsync()
        {
            var userId = Context.UserIdentifier;
            if (userId != null)
            {
                _userConnections[userId] = Context.ConnectionId;
                await UpdateUserStatus(userId, true);
                await Clients.All.SendAsync("UserOnline", userId);
                _logger.LogInformation($"User {userId} connected");
            }
            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            var userId = Context.UserIdentifier;
            if (userId != null)
            {
                _userConnections.Remove(userId);
                await UpdateUserStatus(userId, false);
                await Clients.All.SendAsync("UserOffline", userId);
                _logger.LogInformation($"User {userId} disconnected");
            }
            await base.OnDisconnectedAsync(exception);
        }

        // Join a project chat room
        public async Task JoinProjectGroup(int projectId)
        {
            var userId = Context.UserIdentifier;
            var groupName = $"project-{projectId}";

            // Check if user is a member of this project
            var isMember = await _context.ProjectMembers
                .AnyAsync(pm => pm.ProjectId == projectId && pm.UserId == userId);

            if (!isMember)
            {
                var isCreator = await _context.Projects
                    .AnyAsync(p => p.Id == projectId && p.CreatedById == userId);

                if (!isCreator)
                {
                    throw new HubException("You are not a member of this project");
                }
            }

            await Groups.AddToGroupAsync(Context.ConnectionId, groupName);

            // Track group membership
            if (!_projectGroups.ContainsKey(groupName))
                _projectGroups[groupName] = new HashSet<string>();
            _projectGroups[groupName].Add(userId);

            // Send recent messages
            var recentMessages = await _context.ChatMessages
                .Where(m => m.ProjectId == projectId && !m.IsDeleted)
                .OrderByDescending(m => m.SentAt)
                .Take(50)
                .OrderBy(m => m.SentAt)
                .Include(m => m.Sender)
                .Select(m => new
                {
                    m.Id,
                    m.Message,
                    m.SenderId,
                    SenderName = m.Sender.FullName,
                    m.SentAt,
                    IsRead = m.ReadReceipts.Any(r => r.UserId == userId)
                })
                .ToListAsync();

            await Clients.Caller.SendAsync("LoadMessages", recentMessages);

            _logger.LogInformation($"User {userId} joined project {projectId}");
        }

        // Leave a project chat room
        public async Task LeaveProjectGroup(int projectId)
        {
            var userId = Context.UserIdentifier;
            var groupName = $"project-{projectId}";

            await Groups.RemoveFromGroupAsync(Context.ConnectionId, groupName);

            if (_projectGroups.ContainsKey(groupName))
                _projectGroups[groupName].Remove(userId);

            _logger.LogInformation($"User {userId} left project {projectId}");
        }

        // Send message to project chat
        public async Task SendProjectMessage(int projectId, string message)
        {
            var userId = Context.UserIdentifier;

            if (string.IsNullOrWhiteSpace(message))
                throw new HubException("Message cannot be empty");

            // Save to db
            var chatMessage = new ChatMessage
            {
                ProjectId = projectId,
                SenderId = userId,
                Message = message.Trim(),
                SentAt = DateTime.UtcNow
            };

            _context.ChatMessages.Add(chatMessage);
            await _context.SaveChangesAsync();

            // Get sender info
            var sender = await _context.Users.FindAsync(userId);
            var senderName = sender?.FullName ?? sender?.Email ?? "Unknown";

            var groupName = $"project-{projectId}";
            await Clients.Group(groupName).SendAsync("ReceiveMessage", new
            {
                chatMessage.Id,
                chatMessage.Message,
                SenderId = userId,
                SenderName = senderName,
                chatMessage.SentAt,
                IsRead = false
            });

            _logger.LogInformation($"User {userId} sent message to project {projectId}");
        }

        // Mark message as read
        public async Task MarkMessageAsRead(int messageId, int projectId)
        {
            var userId = Context.UserIdentifier;

            // Check if already marked as read
            var exists = await _context.MessageReadReceipts
                .AnyAsync(r => r.MessageId == messageId && r.UserId == userId);

            if (!exists)
            {
                var receipt = new MessageReadReceipt
                {
                    MessageId = messageId,
                    UserId = userId,
                    ReadAt = DateTime.UtcNow
                };

                _context.MessageReadReceipts.Add(receipt);
                await _context.SaveChangesAsync();

                // Get message details
                var message = await _context.ChatMessages
                    .Include(m => m.Sender)
                    .FirstOrDefaultAsync(m => m.Id == messageId);

                if (message != null)
                {
                    // Notify sender that their message was read
                    await Clients.User(message.SenderId).SendAsync("MessageRead", new
                    {
                        messageId,
                        userId,
                        projectId
                    });

                    // Get total read count for this message
                    var readCount = await _context.MessageReadReceipts
                        .CountAsync(r => r.MessageId == messageId);

                    var totalMembers = await _context.ProjectMembers
                        .CountAsync(pm => pm.ProjectId == projectId) + 1; // +1 for creator

                    var isAllRead = readCount >= totalMembers;

                    // Notify everyone if message is read by all
                    if (isAllRead)
                    {
                        await Clients.Group($"project-{projectId}").SendAsync("MessageReadByAll", new
                        {
                            messageId,
                            projectId
                        });
                    }
                }
            }
        }

        // Get unread message count for a project
        public async Task<int> GetUnreadCount(int projectId)
        {
            var userId = Context.UserIdentifier;

            var unreadCount = await _context.ChatMessages
                .Where(m => m.ProjectId == projectId &&
                           m.SenderId != userId &&
                           !m.ReadReceipts.Any(r => r.UserId == userId) &&
                           !m.IsDeleted)
                .CountAsync();

            return unreadCount;
        }

        // Get user's online status
        public async Task<bool> IsUserOnline(string userId)
        {
            return _userConnections.ContainsKey(userId);
        }

        // Update typing status (optional)
        public async Task SendTypingNotification(int projectId, bool isTyping)
        {
            var userId = Context.UserIdentifier;
            var groupName = $"project-{projectId}";

            await Clients.Group(groupName).SendAsync("UserTyping", new
            {
                userId,
                projectId,
                isTyping
            });
        }

        private async Task UpdateUserStatus(string userId, bool isOnline)
        {
            var user = await _context.Users.FindAsync(userId);
            if (user != null)
            {
                user.IsOnline = isOnline;
                user.LastSeenAt = isOnline ? null : DateTime.UtcNow;
                await _context.SaveChangesAsync();
            }
        }
    }
}