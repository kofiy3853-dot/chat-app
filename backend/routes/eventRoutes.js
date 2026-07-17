const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router();
const eventController = require('../controllers/eventController');
const { authMiddleware } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/authorize');

router.use(authMiddleware);

// Validation middleware
const createEventValidation = [
  body('title').isString().trim().isLength({ min: 1, max: 200 }).withMessage('Title required (max 200 chars)'),
  body('description').isString().trim().isLength({ min: 1, max: 2000 }).withMessage('Description required'),
  body('startTime').isISO8601().withMessage('Valid start time required'),
  body('endTime').isISO8601().withMessage('Valid end time required'),
  body('locationValue').isString().trim().notEmpty().withMessage('Location required'),
  body('category').optional().isIn(['ACADEMIC', 'SOCIAL', 'SPORTS', 'CLUB', 'OTHER']),
  body('visibility').optional().isIn(['PUBLIC', 'PRIVATE']),
  body('maxAttendees').optional().isInt({ min: 1, max: 10000 })
];

router.get('/', eventController.getEvents);
router.post('/', createEventValidation, authorize('create_event'), eventController.createEvent);
router.post('/:eventId/toggle-join', eventController.toggleJoinEvent);
router.delete('/:eventId', authorize('delete_message_in_course'), eventController.deleteEvent);

module.exports = router;
