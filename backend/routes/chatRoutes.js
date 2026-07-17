const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { authMiddleware } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authMiddleware);

// Validation middleware
const sendMessageValidation = [
  body('conversationId').isUUID().withMessage('Valid conversation ID required'),
  body('content').optional().isString().trim().isLength({ max: 5000 }).withMessage('Message too long'),
  body('type').optional().isIn(['TEXT', 'IMAGE', 'FILE', 'VOICE', 'ANNOUNCEMENT', 'SYSTEM', 'ASSIGNMENT', 'MATERIAL', 'CONTACT']).withMessage('Invalid message type'),
  body('replyToId').optional().isUUID().withMessage('Invalid reply ID')
];

const createGroupValidation = [
  body('name').isString().trim().isLength({ min: 1, max: 100 }).withMessage('Group name required (max 100 chars)'),
  body('participantIds').isArray({ min: 1 }).withMessage('At least one participant required'),
  body('participantIds.*').isUUID().withMessage('Invalid participant ID')
];

const directConversationValidation = [
  body('userId').isUUID().withMessage('Valid user ID required')
];

const reactionValidation = [
  body('emoji').isString().trim().isLength({ min: 1, max: 10 }).withMessage('Emoji required')
];

const conversationIdParam = [
  param('id').isUUID().withMessage('Invalid conversation ID'),
  param('conversationId').isUUID().withMessage('Invalid conversation ID')
];

// Conversation routes
router.get('/total-unread', chatController.getTotalUnreadMessages);
router.get('/conversations', chatController.getConversations);
router.post('/conversations/nana', chatController.getOrCreateNanaSession);
router.post('/conversations/direct', directConversationValidation, chatController.getOrCreateDirectConversation);
router.post('/conversations/group', createGroupValidation, chatController.createGroupConversation);
router.get('/conversations/:id', chatController.getConversationById);
router.put('/conversations/:id/archive', chatController.archiveConversation);
router.delete('/conversations/:id', chatController.deleteConversation);
router.put('/conversations/read-all', chatController.markAllAsRead);
router.post('/conversations/delete-multiple', chatController.deleteMultipleConversations);
router.delete('/conversations/:id/clear', chatController.clearChat);

const upload = require('../middleware/uploadMiddleware');

// Message routes
router.get('/conversations/:conversationId/messages', chatController.getMessages);
router.post('/messages', sendMessageValidation, chatController.sendMessage);
router.post('/messages/upload', upload.fields([
  { name: 'file', maxCount: 1 },
  { name: 'voice', maxCount: 1 }
]), chatController.uploadAttachment);
router.put('/conversations/:conversationId/read', chatController.markAsRead);
router.post('/messages/:messageId/reaction', reactionValidation, chatController.addReaction);

module.exports = router;
