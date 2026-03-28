import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns';

// Helper to check if date is valid
const isValidDate = (date) => {
  return date instanceof Date && !isNaN(date.getTime());
};

// Format message timestamp
export const formatMessageTime = (timestamp) => {
  if (!timestamp) return '';
  
  const date = new Date(timestamp);
  if (!isValidDate(date)) return '';
  
  if (isToday(date)) {
    return format(date, 'h:mm a');
  } else if (isYesterday(date)) {
    return 'Yesterday';
  } else {
    return format(date, 'MMM d');
  }
};

// Format full date
export const formatFullDate = (timestamp) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  if (!isValidDate(date)) return '';
  return format(date, 'MMM d, yyyy h:mm a');
};

// Format relative time
export const formatRelativeTime = (timestamp) => {
  if (!timestamp) return 'Never';
  const date = new Date(timestamp);
  if (!isValidDate(date)) return 'Never';
  return formatDistanceToNow(date, { addSuffix: true });
};

// Truncate text
export const truncateText = (text, maxLength = 100) => {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

// Get initials from name
export const getInitials = (name) => {
  if (!name) return '?';
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
};

// Generate random color for avatar
export const getAvatarColor = (name) => {
  const colors = [
    'from-red-400 to-red-600',
    'from-orange-400 to-orange-600',
    'from-amber-400 to-amber-600',
    'from-green-400 to-green-600',
    'from-emerald-400 to-emerald-600',
    'from-teal-400 to-teal-600',
    'from-cyan-400 to-cyan-600',
    'from-blue-400 to-blue-600',
    'from-indigo-400 to-indigo-600',
    'from-violet-400 to-violet-600',
    'from-purple-400 to-purple-600',
    'from-fuchsia-400 to-fuchsia-600',
    'from-pink-400 to-pink-600',
    'from-rose-400 to-rose-600',
  ];
  
  if (!name) return colors[0];
  
  const index = name.split('').reduce((acc, char) => {
    return acc + char.charCodeAt(0);
  }, 0) % colors.length;
  
  return colors[index];
};

// File size formatter
export const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Validate email
export const isValidEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

// Debounce function
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Group messages by date
export const groupMessagesByDate = (messages) => {
  const groups = {};
  
  if (!messages || !Array.isArray(messages)) return groups;

  messages.forEach(message => {
    if (!message.createdAt) return;
    const date = new Date(message.createdAt);
    if (!isValidDate(date)) return;
    
    const dateKey = format(date, 'yyyy-MM-dd');
    
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(message);
  });
  
  return groups;
};

// Get current user from localStorage
export const getCurrentUser = () => {
  if (typeof window === 'undefined') return null;
  const userStr = localStorage.getItem('user');
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch (error) {
    console.error('Failed to parse user from localStorage:', error);
    return null;
  }
};

