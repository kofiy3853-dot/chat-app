const express = require('express');
const router = express.Router();
const announcementController = require('../controllers/announcementController');
const { authMiddleware } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/authorize');

router.get('/', announcementController.getAnnouncements);
router.post('/', authMiddleware, authorize('create_announcement'), announcementController.createAnnouncement);
router.delete('/:id', authMiddleware, authorize('delete_any_message'), announcementController.deleteAnnouncement);

module.exports = router;
