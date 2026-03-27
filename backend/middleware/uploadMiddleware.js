const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'voice') {
      cb(null, 'uploads/voice');
    } else {
      cb(null, 'uploads/files');
    }
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// File filter (optional: restrict types)
const fileFilter = (req, file, cb) => {
  if (file.fieldname === 'voice') {
    // Basic check for audio files
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed for voice notes'), false);
    }
  } else {
    // Allow all images, docs, pdfs, and generic common files
    if (file.mimetype.startsWith('image/') || 
        file.mimetype.startsWith('application/pdf') ||
        file.mimetype.includes('word') ||
        file.mimetype.includes('officedocument') ||
        file.mimetype.startsWith('text/')) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}`), false);
    }
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

module.exports = upload;
