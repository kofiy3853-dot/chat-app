const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Storage configuration
const storage = multer.memoryStorage();

// Allowed MIME types (allowlist approach — only safe types pass)
const ALLOWED_MIME_TYPES = new Set([
  // Images
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  // Audio
  'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/mp4',
  // Video
  'video/mp4', 'video/webm', 'video/quicktime',
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain', 'text/csv',
  // Archives
  'application/zip', 'application/x-7z-compressed', 'application/x-rar-compressed',
  // Other safe types
  'application/json',
]);

// Dangerous extension patterns to block regardless of MIME
const BLOCKED_EXTENSIONS = new Set([
  '.exe', '.bat', '.cmd', '.com', '.msi', '.scr', '.pif',
  '.sh', '.bash', '.zsh', '.csh',
  '.js', '.vbs', '.vbe', '.wsf', '.wsh',
  '.ps1', '.psm1', '.psd1',
  '.jar', '.class', '.py', '.rb', '.pl',
  '.html', '.htm', '.svg', // block HTML/SVG to prevent stored XSS
]);

// File filter - allowlist approach with extension validation
const fileFilter = (req, file, cb) => {
  if (file.fieldname === 'voice') {
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed for voice notes'), false);
    }
    return;
  }

  // Check file extension
  const ext = path.extname(file.originalname).toLowerCase();
  if (BLOCKED_EXTENSIONS.has(ext)) {
    cb(new Error(`File extension not allowed: ${ext}`), false);
    return;
  }

  // Check MIME type against allowlist
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    cb(new Error(`File type not allowed: ${file.mimetype}`), false);
    return;
  }

  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 25 * 1024 * 1024 // 25MB limit
  }
});

module.exports = upload;
