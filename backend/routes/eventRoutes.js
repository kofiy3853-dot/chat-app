const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', eventController.getEvents);
router.post('/', eventController.createEvent);
router.post('/:eventId/toggle-join', eventController.toggleJoinEvent);

module.exports = router;
