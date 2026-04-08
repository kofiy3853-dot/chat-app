import axios from 'axios';
import { toast } from 'react-hot-toast';
import Router from 'next/router';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 
  (typeof window !== 'undefined' && window.location.hostname !== 'localhost' 
    ? 'https://veritas-uk6l.onrender.com/api' 
    : 'http://localhost:5000/api');

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  timeout: 60000 // 60s to handle Render.com cold starts (can take up to 50s)
});

// Warmup the backend server silently (fire-and-forget)
// Called by the login page to avoid cold-start timeout on the actual login request
export const warmupServer = () => {
  const backendBase = API_URL.replace('/api', '');
  return fetch(`${backendBase}/health`, { method: 'GET', signal: AbortSignal.timeout(55000) })
    .catch(() => {}); // Ignore errors — just warming up
};

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

/** Login/register failures use 401/400 — must not run "session expired" logic. */
function isAuthCredentialRequest(config) {
  const url = config?.url || '';
  return url.includes('/auth/login') || url.includes('/auth/register');
}

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const cfg = error.config;

    if (error.response?.status === 401 && !isAuthCredentialRequest(cfg)) {
      // Token expired or invalid on a protected call — not a failed login attempt
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        if (Router.pathname !== '/login') {
          Router.push('/login');
        }
      }
    } else if (error.response && !isAuthCredentialRequest(cfg)) {
      // Show error notification for server errors (pages handle login/register inline)
      const message = error.response.data?.message || 'Something went wrong. Please try again.';
      if (typeof window !== 'undefined') {
        toast.error(message, { 
          id: 'api-error', // Prevent multiple identical toasts
          position: 'top-center',
          style: {
            background: '#333',
            color: '#fff',
            borderRadius: '16px',
            fontSize: '14px',
            fontWeight: 'bold'
          }
        });
      }
    } else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      // Timeout — likely a Render cold start
      if (typeof window !== 'undefined') {
        toast.error('Server is slow to respond. Please try again in a few seconds.', { 
          id: 'timeout-error',
          duration: 5000
        });
      }
    } else if (error.request) {
      // Network error (no response received)
      if (typeof window !== 'undefined') {
        toast.error('Network error. Check your connection.', { id: 'network-error' });
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
  searchUsers: (query, faculty = '', level = '', config = {}) => {
    let url = `/users/search?query=${query}`;
    if (faculty) url += `&faculty=${faculty}`;
    if (level) url += `&level=${level}`;
    return api.get(url, config);
  },
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
  getNanaSession: () =>
    api.post('/chat/conversations/nana'),
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
    api.post('/chat/messages/upload', formData),
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
  addMaterial: (id, data) => api.post(`/courses/${id}/materials`, data),
  deleteMaterial: (courseId, materialId) => 
    api.delete(`/courses/${courseId}/materials/${materialId}`),
  
  // Assignments
  getAssignments: (id) => api.get(`/courses/${id}/assignments`),
  createAssignment: (id, data) => api.post(`/courses/${id}/assignments`, data),
  submitAssignment: (assignmentId, data) => 
    api.post(`/courses/assignments/${assignmentId}/submit`, data),
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
  uploadImage: (formData) => api.post('/status/upload', formData),
  deleteStatus: (statusId) => api.delete(`/status/${statusId}`)
};

// Event API
export const eventAPI = {
  getEvents: (page = 1, limit = 20) => api.get(`/events?page=${page}&limit=${limit}`),
  createEvent: (data) => api.post('/events', data),
  toggleJoin: (eventId) => api.post(`/events/${eventId}/toggle-join`),
  deleteEvent: (eventId) => api.delete(`/events/${eventId}`)
};

// Announcement API
export const announcementAPI = {
  getAnnouncements: (page = 1, limit = 20) => api.get(`/announcements?page=${page}&limit=${limit}`),
  createAnnouncement: (data) => api.post('/announcements', data),
  deleteAnnouncement: (id) => api.delete(`/announcements/${id}`)
};

// Anonymous API
export const anonymousAPI = {
  getPosts: (page = 1, limit = 20) => api.get(`/anonymous?page=${page}&limit=${limit}`),
  createPost: (data) => api.post('/anonymous', data),
  deletePost: (id) => api.delete(`/anonymous/${id}`)
};

export const pushAPI = {
  updateFcmToken: (fcmToken) => api.post('/notifications/fcm-token', { fcmToken }),
  testPush: () => api.post('/notifications/test')
};

export default api;
