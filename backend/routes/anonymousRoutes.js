const express = require('express');
const router = express.Router();
const anonymousController = require('../controllers/anonymousController');
const { authMiddleware } = require('../middleware/authMiddleware');

router.get('/', anonymousController.getAnonymousPosts);
router.post('/', authMiddleware, anonymousController.createAnonymousPost);

module.exports = router;
