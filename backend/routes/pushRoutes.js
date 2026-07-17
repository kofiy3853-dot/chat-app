const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const pushController = require('../controllers/pushController');
const { authMiddleware } = require('../middleware/authMiddleware');

// Validation middleware
const fcmTokenValidation = [
  body('fcmToken').isString().trim().isLength({ min: 10, max: 500 }).withMessage('Valid FCM token required')
];

router.post('/fcm-token', authMiddleware, fcmTokenValidation, pushController.updateFcmToken);
router.post('/test', authMiddleware, pushController.sendTestPush);

module.exports = router;
