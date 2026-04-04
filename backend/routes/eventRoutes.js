const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const { authMiddleware } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/authorize');

router.use(authMiddleware);

router.get('/', eventController.getEvents);
router.post('/', authorize('create_event'), eventController.createEvent);
router.post('/:eventId/toggle-join', eventController.toggleJoinEvent);
router.delete('/:eventId', authorize('delete_message_in_course'), eventController.deleteEvent);

module.exports = router;
