const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  instructor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  students: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  semester: {
    type: String,
    required: true
  },
  year: {
    type: Number,
    required: true
  },
  department: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  settings: {
    allowStudentChat: {
      type: Boolean,
      default: true
    },
    allowFileSharing: {
      type: Boolean,
      default: true
    },
    announcementsOnly: {
      type: Boolean,
      default: false
    }
  },
  conversation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    default: null
  }
}, {
  timestamps: true
});

// Index for faster queries
courseSchema.index({ code: 1 });
courseSchema.index({ instructor: 1 });
courseSchema.index({ students: 1 });

module.exports = mongoose.model('Course', courseSchema);
