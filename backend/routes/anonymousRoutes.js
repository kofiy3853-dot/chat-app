const express = require('express');
const router = express.Router();
const anonymousController = require('../controllers/anonymousController');
const { authMiddleware, optionalAuthMiddleware } = require('../middleware/authMiddleware');

router.get('/', optionalAuthMiddleware, anonymousController.getAnonymousPosts);
router.post('/', authMiddleware, anonymousController.createAnonymousPost);
router.delete('/:id', authMiddleware, anonymousController.deleteAnonymousPost);

module.exports = router;
