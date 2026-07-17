const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const announcementController = require('../controllers/announcementController');
const { authMiddleware } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/authorize');

// Validation middleware
const createAnnouncementValidation = [
  body('title').isString().trim().isLength({ min: 1, max: 200 }).withMessage('Title required (max 200 chars)'),
  body('content').isString().trim().isLength({ min: 1, max: 5000 }).withMessage('Content required'),
  body('targetCourseId').optional().isUUID(),
  body('targetDepartment').optional().isString().trim(),
  body('targetAll').optional().isBoolean()
];

router.get('/', announcementController.getAnnouncements);
router.post('/', authMiddleware, createAnnouncementValidation, authorize('create_announcement'), announcementController.createAnnouncement);
router.delete('/:id', authMiddleware, authorize('delete_any_message'), announcementController.deleteAnnouncement);

module.exports = router;
