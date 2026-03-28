import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  changePassword: (data) => api.put('/auth/change-password', data)
};

// User API
export const userAPI = {
  searchUsers: (query) => api.get(`/users/search?query=${query}`),
  getUserById: (id) => api.get(`/users/${id}`),
  getOnlineUsers: () => api.get('/users/online'),
  updateStatus: (isOnline) => api.put('/users/status', { isOnline }),
  getNotifications: (page = 1) => api.get(`/users/notifications?page=${page}`),
  getUnreadCount: () => api.get('/users/notifications/unread-count'),
  markNotificationsAsRead: (data) => api.put('/users/notifications/read', data)
};

// Chat API
export const chatAPI = {
  getConversations: () => api.get('/chat/conversations'),
  getConversationById: (id) => api.get(`/chat/conversations/${id}`),
  getOrCreateDirectConversation: (userId) => 
    api.post('/chat/conversations/direct', { userId }),
  createGroupConversation: (name, participantIds) => 
    api.post('/chat/conversations/group', { name, participantIds }),
  getMessages: (conversationId, page = 1, limit = 50) => 
    api.get(`/chat/conversations/${conversationId}/messages?page=${page}&limit=${limit}`),
  sendMessage: (data) => api.post('/chat/messages', data),
  markAsRead: (conversationId) => 
    api.put(`/chat/conversations/${conversationId}/read`),
  addReaction: (messageId, emoji) => 
    api.post(`/chat/messages/${messageId}/reaction`, { emoji }),
  uploadMessageAttachment: (formData) => 
    api.post('/chat/messages/upload', formData),
  archiveConversation: (id) => api.put(`/chat/conversations/${id}/archive`),
  deleteConversation: (id) => api.delete(`/chat/conversations/${id}`)
};

// Course API
export const courseAPI = {
  getCourses: () => api.get('/courses'),
  getCourseById: (id) => api.get(`/courses/${id}`),
  createCourse: (data) => api.post('/courses', data),
  joinCourse: (courseCode) => api.post('/courses/join', { courseCode }),
  leaveCourse: (id) => api.put(`/courses/${id}/leave`),
  updateCourseSettings: (id, settings) => 
    api.put(`/courses/${id}/settings`, { settings }),
  removeStudent: (id, studentId) => 
    api.delete(`/courses/${id}/students/${studentId}`)
};

export default api;
