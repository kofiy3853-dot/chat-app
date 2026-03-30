const express = require('express');
const router = express.Router();
const announcementController = require('../controllers/announcementController');
const { authMiddleware } = require('../middleware/authMiddleware');

router.get('/', announcementController.getAnnouncements);
router.post('/', authMiddleware, announcementController.createAnnouncement);

module.exports = router;
