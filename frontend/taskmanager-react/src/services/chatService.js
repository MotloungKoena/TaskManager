import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';

class ChatService {
  constructor() {
    this.connection = null;
    this.listeners = {
      receiveMessage: [],
      loadMessages: [],
      userOnline: [],
      userOffline: [],
      messageRead: [],
      messageReadByAll: [],
      userTyping: [],
    };
  }

  connect(token) {
    if (this.connection) {
      return Promise.resolve();
    }

    const baseUrl = import.meta.env.VITE_API_URL || 'https://localhost:7066';
    
    this.connection = new HubConnectionBuilder()
      .withUrl(`${baseUrl}/chathub`, {
        accessTokenFactory: () => token,
      })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Information)
      .build();

    // Set up event handlers
    this.connection.on('ReceiveMessage', (message) => {
      this.trigger('receiveMessage', message);
    });

    this.connection.on('LoadMessages', (messages) => {
      this.trigger('loadMessages', messages);
    });

    this.connection.on('UserOnline', (userId) => {
      this.trigger('userOnline', userId);
    });

    this.connection.on('UserOffline', (userId) => {
      this.trigger('userOffline', userId);
    });

    this.connection.on('MessageRead', (data) => {
      this.trigger('messageRead', data);
    });

    this.connection.on('MessageReadByAll', (data) => {
      this.trigger('messageReadByAll', data);
    });

    this.connection.on('UserTyping', (data) => {
      this.trigger('userTyping', data);
    });

    return this.connection.start();
  }

  disconnect() {
    if (this.connection) {
      this.connection.stop();
      this.connection = null;
    }
  }

  // Join a project chat room
  joinProjectGroup(projectId) {
    if (this.connection) {
      return this.connection.invoke('JoinProjectGroup', projectId);
    }
    return Promise.reject('Not connected');
  }

  // Leave a project chat room
  leaveProjectGroup(projectId) {
    if (this.connection) {
      return this.connection.invoke('LeaveProjectGroup', projectId);
    }
    return Promise.reject('Not connected');
  }

  // Send a message
  sendMessage(projectId, message) {
    if (this.connection) {
      return this.connection.invoke('SendProjectMessage', projectId, message);
    }
    return Promise.reject('Not connected');
  }

  // Mark message as read
  markAsRead(messageId, projectId) {
    if (this.connection) {
      return this.connection.invoke('MarkMessageAsRead', messageId, projectId);
    }
    return Promise.reject('Not connected');
  }

  // Send typing notification
  sendTyping(projectId, isTyping) {
    if (this.connection) {
      return this.connection.invoke('SendTypingNotification', projectId, isTyping);
    }
  }

  // Event listeners
  on(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event].push(callback);
    }
  }

  off(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
  }

  trigger(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => callback(data));
    }
  }

  isConnected() {
    return this.connection && this.connection.state === 'Connected';
  }
}

export const chatService = new ChatService();