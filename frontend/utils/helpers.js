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
export const formatRelativeTime = (timestamp, options = { addSuffix: true }) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  if (!isValidDate(date)) return '';
  return formatDistanceToNow(date, options);
};

// Format short time for chat list (e.g., "4h", "1d", "now")
export const formatShortTime = (timestamp) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  if (!isValidDate(date)) return '';
  
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);
  
  if (diffInSeconds < 60) return 'now';
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;
  
  const diffInWeeks = Math.floor(diffInDays / 7);
  return `${diffInWeeks}w ago`;
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

// Reconstruct full URL for files/avatars
export const getFullFileUrl = (url) => {
  if (!url) return null;
  
  // 1. If it's already an absolute URL (Supabase, external) or a local blob
  if (url.startsWith('http') || url.startsWith('blob:')) {
    return url;
  }
  
  // 2. Otherwise assume it's a relative path from our own backend
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
  const baseUrl = apiUrl.split('/api')[0];
    
  let path = url;
  if (!path.startsWith('/')) {
    // Legacy local files might not have a leading slash
    if (!path.includes('uploads/')) {
      path = `/uploads/${path}`;
    } else {
      path = `/${path}`;
    }
  }
    
  return `${baseUrl}${path}`;
};

// Client-side image compression using Canvas
export const compressImage = (file, maxWidth = 512, maxHeight = 512, quality = 0.6) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          if (blob) {
            // Return a new File object
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          } else {
            reject(new Error('Canvas toBlob failed'));
          }
        }, 'image/jpeg', quality);
      };
      img.onerror = (e) => reject(e);
    };
    reader.onerror = (e) => reject(e);
  });
};
