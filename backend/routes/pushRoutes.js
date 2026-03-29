const express = require('express');
const router = express.Router();
const pushController = require('../controllers/pushController');
const { authMiddleware } = require('../middleware/authMiddleware');

router.post('/subscribe', authMiddleware, pushController.subscribe);
router.get('/vapid-public-key', authMiddleware, pushController.getPublicKey);

module.exports = router;
