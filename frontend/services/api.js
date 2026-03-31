import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  timeout: 35000, // Handle backend cold starts (Render free tier)
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
  getUnreadChatCount: () => api.get('/chat/total-unread'),
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
  markAllAsRead: () => api.put('/chat/conversations/read-all'),
  deleteMultipleConversations: (conversationIds) => 
    api.post('/chat/conversations/delete-multiple', { conversationIds }),
  addReaction: (messageId, emoji) => 
    api.post(`/chat/messages/${messageId}/reaction`, { emoji }),
  uploadMessageAttachment: (formData) => 
    api.post('/chat/messages/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    }),
  archiveConversation: (id) => api.put(`/chat/conversations/${id}/archive`),
  deleteConversation: (id) => api.delete(`/chat/conversations/${id}`),
  clearChat: (id) => api.delete(`/chat/conversations/${id}/clear`)
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
    api.delete(`/courses/${id}/students/${studentId}`),
  
  // Materials
  getMaterials: (id) => api.get(`/courses/${id}/materials`),
  addMaterial: (id, data) => api.post(`/courses/${id}/materials`, data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  deleteMaterial: (courseId, materialId) => 
    api.delete(`/courses/${courseId}/materials/${materialId}`),
  
  // Assignments
  getAssignments: (id) => api.get(`/courses/${id}/assignments`),
  createAssignment: (id, data) => api.post(`/courses/${id}/assignments`, data),
  submitAssignment: (assignmentId, data) => 
    api.post(`/courses/assignments/${assignmentId}/submit`, data, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  getSubmissions: (assignmentId) => 
    api.get(`/courses/assignments/${assignmentId}/submissions`),
  postAnnouncement: (id, content) => api.post(`/courses/${id}/announcements`, { content })
};

// Status API
export const statusAPI = {
  createStatus: (data) => api.post('/status', data),
  getStatuses: () => api.get('/status'),
  viewStatus: (statusId) => api.post(`/status/${statusId}/view`),
  getViewers: (statusId) => api.get(`/status/${statusId}/viewers`),
  uploadImage: (formData) => api.post('/status/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
};

// Event API
export const eventAPI = {
  getEvents: (page = 1, limit = 20) => api.get(`/events?page=${page}&limit=${limit}`),
  createEvent: (data) => api.post('/events', data),
  toggleJoin: (eventId) => api.post(`/events/${eventId}/toggle-join`)
};

// Announcement API
export const announcementAPI = {
  getAnnouncements: (page = 1, limit = 20) => api.get(`/announcements?page=${page}&limit=${limit}`),
  createAnnouncement: (data) => api.post('/announcements', data)
};

// Anonymous API
export const anonymousAPI = {
  getPosts: (page = 1, limit = 20) => api.get(`/anonymous?page=${page}&limit=${limit}`),
  createPost: (data) => api.post('/anonymous', data)
};

export default api;
