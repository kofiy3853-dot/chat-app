const express = require('express');
const router = express.Router();
const pushController = require('../controllers/pushController');
const { protect } = require('../middleware/authMiddleware');

router.post('/subscribe', protect, pushController.subscribe);
router.get('/vapid-public-key', protect, pushController.getPublicKey);

module.exports = router;
