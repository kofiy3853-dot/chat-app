import { io } from 'socket.io-client';

let socket = null;

export const initSocket = () => {
  if (socket) return socket;

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  
  // Don't connect without a token — user isn't authenticated
  if (!token) return null;

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
  const socketUrl = apiUrl.endsWith('/api') ? apiUrl.slice(0, -4) : apiUrl;

  socket = io(socketUrl, {
    auth: { token },
    transports: ['websocket'],
    autoConnect: true
  });

  socket.on('connect', () => {
    console.log('Socket connected');
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected');
  });

  socket.on('connect_error', (error) => {
    // Only log if it's not a simple auth error (expected on public pages)
    if (!error.message?.includes('Authentication error')) {
      console.error('Socket connection error:', error);
    }
  });

  return socket;
};

export const getSocket = () => {
  if (!socket) {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) return null;
    return initSocket();
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const joinConversation = (conversationId) => {
  const socket = getSocket();
  socket.emit('join-conversation', conversationId);
};

export const leaveConversation = (conversationId) => {
  const socket = getSocket();
  socket.emit('leave-conversation', conversationId);
};

export const sendMessage = (data) => {
  const socket = getSocket();
  socket.emit('send-message', data);
};

export const sendTyping = (conversationId, isTyping) => {
  const socket = getSocket();
  socket.emit('typing', { conversationId, isTyping });
};

export const markAsRead = (conversationId) => {
  const socket = getSocket();
  socket.emit('mark-read', { conversationId });
};

export const addReaction = (messageId, emoji) => {
  const socket = getSocket();
  socket.emit('add-reaction', { messageId, emoji });
};

export const joinCourse = (courseId) => {
  const socket = getSocket();
  socket.emit('join-course', courseId);
};

export const leaveCourse = (courseId) => {
  const socket = getSocket();
  socket.emit('leave-course', courseId);
};

export const sendAnnouncement = (data) => {
  const socket = getSocket();
  socket.emit('send-announcement', data);
};

export default {
  initSocket,
  getSocket,
  disconnectSocket,
  joinConversation,
  leaveConversation,
  sendMessage,
  sendTyping,
  markAsRead,
  addReaction,
  joinCourse,
  leaveCourse,
  sendAnnouncement
};

