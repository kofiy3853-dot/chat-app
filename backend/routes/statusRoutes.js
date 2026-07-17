const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const statusController = require('../controllers/statusController');
const { authMiddleware } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// All status routes require authentication
router.use(authMiddleware);

// Validation middleware
const createStatusValidation = [
  body('type').optional().isIn(['TEXT', 'IMAGE', 'VIDEO']).withMessage('Invalid status type'),
  body('textContent').optional().isString().trim().isLength({ max: 500 }),
  body('caption').optional().isString().trim().isLength({ max: 200 }),
  body('backgroundColor').optional().isString().matches(/^#[0-9A-Fa-f]{6}$/).withMessage('Invalid color format')
];

router.post('/', createStatusValidation, statusController.createStatus);
router.post('/upload', upload.fields([{ name: 'file', maxCount: 1 }]), statusController.uploadImage);
router.get('/', statusController.getStatuses);
router.post('/:statusId/view', statusController.viewStatus);
router.get('/:statusId/viewers', statusController.getStatusViewers);
router.delete('/:statusId', statusController.deleteStatus);

module.exports = router;
