const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Storage configuration
const storage = multer.memoryStorage();

// File filter - blocks only potentially dangerous executables
const fileFilter = (req, file, cb) => {
  if (file.fieldname === 'voice') {
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed for voice notes'), false);
    }
  } else {
    // Block executable / script types only
    const blocked = [
      'application/x-msdownload', 'application/x-sh',
      'application/x-bat', 'application/x-msdos-program'
    ];
    if (blocked.includes(file.mimetype)) {
      cb(new Error(`File type not allowed: ${file.mimetype}`), false);
    } else {
      cb(null, true);
    }
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 25 * 1024 * 1024 // 25MB limit
  }
});

module.exports = upload;
