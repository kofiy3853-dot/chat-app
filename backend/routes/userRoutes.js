const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authMiddleware } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authMiddleware);

router.get('/search', userController.searchUsers);
router.get('/online', userController.getOnlineUsers);
router.get('/notifications', userController.getNotifications);
router.get('/notifications/unread-count', userController.getUnreadCount);
router.put('/notifications/read', userController.markNotificationsAsRead);
router.put('/status', userController.updateStatus);

// Put wildcard/dynamic routes at the bottom
router.get('/:id', userController.getUserById);

module.exports = router;
