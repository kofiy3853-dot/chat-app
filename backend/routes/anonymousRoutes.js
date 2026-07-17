const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const anonymousController = require('../controllers/anonymousController');
const { authMiddleware, optionalAuthMiddleware } = require('../middleware/authMiddleware');

// Validation middleware
const createPostValidation = [
  body('content').isString().trim().isLength({ min: 1, max: 2000 }).withMessage('Content required (max 2000 chars)'),
  body('tags').optional().isString().trim().isLength({ max: 200 })
];

router.get('/', optionalAuthMiddleware, anonymousController.getAnonymousPosts);
router.post('/', authMiddleware, createPostValidation, anonymousController.createAnonymousPost);
router.delete('/:id', authMiddleware, anonymousController.deleteAnonymousPost);

module.exports = router;
