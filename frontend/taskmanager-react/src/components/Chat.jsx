import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { chatService } from '../services/chatService';
import { formatDistanceToNow } from 'date-fns';

const Chat = ({ projectId }) => {
  const { user, token } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const typingTimeoutRef = useRef(null);

   useEffect(() => {
    if (!token || !projectId) return;

    let isMounted = true;

    const connect = async () => {
      try {
        await chatService.connect(token);
        if (isMounted) {
          setIsConnected(true);
          await chatService.joinProjectGroup(projectId);
        }
      } catch (error) {
        console.error('Failed to connect to chat:', error);
      }
    };

    connect();

    // Set up event listeners
    const receiveMessageHandler = (message) => {
      if (isMounted) {
        setMessages(prev => [...prev, message]);
        if (message.senderId !== user?.id) {
          // Mark message as read if it's not from current user
          chatService.markAsRead(message.id, projectId);
        }
        scrollToBottom();
      }
    };

    const loadMessagesHandler = (loadedMessages) => {
      if (isMounted) {
        setMessages(loadedMessages);
        // Mark all messages as read
        loadedMessages.forEach(msg => {
          if (msg.senderId !== user?.id && !msg.isRead) {
            chatService.markAsRead(msg.id, projectId);
          }
        });
        setTimeout(scrollToBottom, 100);
      }
    };

    const userTypingHandler = ({ userId, isTyping }) => {
      if (isMounted && userId !== user?.id) {
        setTypingUsers(prev => {
          const newSet = new Set(prev);
          if (isTyping) {
            newSet.add(userId);
          } else {
            newSet.delete(userId);
          }
          return newSet;
        });
      }
    };

    chatService.on('receiveMessage', receiveMessageHandler);
    chatService.on('loadMessages', loadMessagesHandler);
    chatService.on('userTyping', userTypingHandler);

    return () => {
      isMounted = false;
      chatService.off('receiveMessage', receiveMessageHandler);
      chatService.off('loadMessages', loadMessagesHandler);
      chatService.off('userTyping', userTypingHandler);
      if (projectId) {
        chatService.leaveProjectGroup(projectId);
      }
      chatService.disconnect();
    };
  }, [projectId, token, user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !isConnected) return;

    try {
      await chatService.sendMessage(projectId, newMessage.trim());
      setNewMessage('');
      // Clear typing status
      chatService.sendTyping(projectId, false);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    
    // Send typing notification
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    if (e.target.value.trim()) {
      chatService.sendTyping(projectId, true);
    } else {
      chatService.sendTyping(projectId, false);
    }
    
    // Stop typing after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      chatService.sendTyping(projectId, false);
    }, 2000);
  };

  const formatMessageTime = (date) => {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  };

  const isOwnMessage = (senderId) => {
    return senderId === user?.id;
  };

  return (
    <div className="flex flex-col h-96 bg-white rounded-lg shadow">
      {/* Chat Header */}
      <div className="px-4 py-2 border-b bg-gray-50 rounded-t-lg">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">Project Chat</h3>
          <div className="flex items-center space-x-2">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-xs text-gray-500">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
      </div>

      {/* Messages Container */}
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-3"
      >
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">
            No messages yet. Start the conversation! 💬
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${isOwnMessage(msg.senderId) ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[70%] ${isOwnMessage(msg.senderId) ? 'order-2' : 'order-1'}`}>
                {!isOwnMessage(msg.senderId) && (
                  <div className="text-xs font-medium text-gray-600 mb-1">
                    {msg.senderName}
                  </div>
                )}
                <div
                  className={`px-3 py-2 rounded-lg ${
                    isOwnMessage(msg.senderId)
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-800'
                  }`}
                >
                  <p className="text-sm break-words">{msg.message}</p>
                  <div className={`flex items-center justify-end mt-1 space-x-1 text-xs ${
                    isOwnMessage(msg.senderId) ? 'text-blue-100' : 'text-gray-500'
                  }`}>
                    <span>{formatMessageTime(msg.sentAt)}</span>
                    {isOwnMessage(msg.senderId) && (
                      <span>
                        {msg.isRead ? '✓✓' : '✓'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
        
        {/* Typing indicator */}
        {typingUsers.size > 0 && (
          <div className="flex items-center space-x-1 text-gray-500 text-sm">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span className="text-xs">Someone is typing...</span>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <form onSubmit={handleSendMessage} className="p-3 border-t">
        <div className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={handleTyping}
            placeholder="Type a message..."
            className="flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            disabled={!isConnected}
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || !isConnected}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
};

export default Chat;