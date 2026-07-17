const express = require('express');
const { body, query, param } = require('express-validator');
const router = express.Router();
const userController = require('../controllers/userController');
const { authMiddleware } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authMiddleware);

// Validation middleware
const searchValidation = [
  query('query').isString().trim().isLength({ min: 1, max: 100 }).withMessage('Search query required'),
  query('faculty').optional().isString().trim(),
  query('level').optional().isString().trim()
];

const updateStatusValidation = [
  body('isOnline').isBoolean().withMessage('isOnline must be a boolean')
];

const markReadValidation = [
  body('notificationIds').optional().isArray(),
  body('notificationIds.*').optional().isUUID()
];

router.get('/search', searchValidation, userController.searchUsers);
router.get('/online', userController.getOnlineUsers);
router.get('/notifications', userController.getNotifications);
router.get('/notifications/unread-count', userController.getUnreadCount);
router.put('/notifications/read', markReadValidation, userController.markNotificationsAsRead);
router.put('/status', updateStatusValidation, userController.updateStatus);

// Put wildcard/dynamic routes at the bottom
router.get('/:id', userController.getUserById);

module.exports = router;
