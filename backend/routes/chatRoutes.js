const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { authMiddleware } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authMiddleware);

// Conversation routes
router.get('/conversations', chatController.getConversations);
router.post('/conversations/direct', chatController.getOrCreateDirectConversation);
router.post('/conversations/group', chatController.createGroupConversation);
router.get('/conversations/:id', chatController.getConversationById);
router.put('/conversations/:id/archive', chatController.archiveConversation);
router.delete('/conversations/:id', chatController.deleteConversation);
router.put('/conversations/read-all', chatController.markAllAsRead);
router.post('/conversations/delete-multiple', chatController.deleteMultipleConversations);
router.delete('/conversations/:id/clear', chatController.clearChat);

const upload = require('../middleware/uploadMiddleware');

// Message routes
router.get('/conversations/:conversationId/messages', chatController.getMessages);
router.post('/messages', chatController.sendMessage);
router.post('/messages/upload', upload.fields([
  { name: 'file', maxCount: 1 },
  { name: 'voice', maxCount: 1 }
]), chatController.uploadAttachment);
router.put('/conversations/:conversationId/read', chatController.markAsRead);
router.post('/messages/:messageId/reaction', chatController.addReaction);

module.exports = router;
