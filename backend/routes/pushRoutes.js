const express = require('express');
const router = express.Router();
const pushController = require('../controllers/pushController');
const { authMiddleware } = require('../middleware/authMiddleware');

router.post('/fcm-token', authMiddleware, pushController.updateFcmToken);

module.exports = router;
