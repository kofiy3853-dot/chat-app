import { io } from 'socket.io-client';

let socket = null;

export const initSocket = () => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (!token) {
    console.warn('[SOCKET] Initialization aborted: No token found in localStorage.');
    return null;
  }

  if (socket) {
    console.log('[SOCKET] Refreshing token & re-connecting...', !!token);
    socket.auth = { token };
    socket.connect();
    return socket;
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 
    (typeof window !== 'undefined' && window.location.hostname !== 'localhost' 
      ? 'https://veritas-uk6l.onrender.com/api' 
      : 'http://localhost:5000/api');

  const socketUrl = apiUrl.endsWith('/api') ? apiUrl.slice(0, -4) : apiUrl;

  console.log('[SOCKET] Connecting to:', socketUrl);

  socket = io(socketUrl, {
    auth: { token },
    transports: ['websocket', 'polling'], // Prioritizes websocket
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: Infinity, // Keep trying
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
    forceNew: true
  });

  socket.on('connect', () => {
    console.log('[SOCKET] Connected! ID:', socket.id);
  });

  socket.on('disconnect', (reason) => {
    console.warn('[SOCKET] Disconnected:', reason);
    if (reason === 'io server disconnect') {
      socket.connect();
    }
  });

  socket.on('connect_error', (error) => {
    console.error('[SOCKET] Connection Error:', error.message);
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
    console.log('Manually disconnecting socket...');
    socket.disconnect();
    socket = null;
  }
};

/**
 * Re-initialize the socket if the token has changed (e.g., after login/logout)
 */
export const reconnectWithNewToken = () => {
  disconnectSocket();
  return initSocket();
};

export const joinConversation = (conversationId) => {
  const socket = getSocket();
  if (socket) socket.emit('join-conversation', conversationId);
};

export const leaveConversation = (conversationId) => {
  const socket = getSocket();
  if (socket) socket.emit('leave-conversation', conversationId);
};

export const sendMessage = (data) => {
  const socket = getSocket();
  if (socket) socket.emit('send-message', data);
};

export const sendTyping = (conversationId, isTyping) => {
  const socket = getSocket();
  if (socket) socket.emit('typing', { conversationId, isTyping });
};

export const markAsRead = (conversationId) => {
  const socket = getSocket();
  if (socket) socket.emit('mark-read', { conversationId });
};

export const addReaction = (messageId, emoji) => {
  const socket = getSocket();
  if (socket) socket.emit('add-reaction', { messageId, emoji });
};

export const editMessage = (messageId, content) => {
  const socket = getSocket();
  if (socket) socket.emit('edit-message', { messageId, content });
};

export const deleteMessage = (messageId) => {
  const socket = getSocket();
  if (socket) socket.emit('delete-message', { messageId });
};

export const joinCourse = (courseId) => {
  const socket = getSocket();
  if (socket) socket.emit('join-course', courseId);
};

export const leaveCourse = (courseId) => {
  const socket = getSocket();
  if (socket) socket.emit('leave-course', courseId);
};

export const sendAnnouncement = (data) => {
  const socket = getSocket();
  if (socket) socket.emit('send-announcement', data);
};
