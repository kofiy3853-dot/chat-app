const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const { authMiddleware } = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.get('/', eventController.getEvents);
router.post('/', eventController.createEvent);
router.post('/:eventId/toggle-join', eventController.toggleJoinEvent);
router.delete('/:eventId', eventController.deleteEvent);

module.exports = router;
