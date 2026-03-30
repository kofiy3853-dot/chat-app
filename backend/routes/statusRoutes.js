const express = require('express');
const router = express.Router();
const statusController = require('../controllers/statusController');
const protect = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// All status routes require authentication
router.use(protect);

router.post('/', statusController.createStatus);
router.post('/upload', upload.fields([{ name: 'file', maxCount: 1 }]), statusController.uploadImage);
router.get('/', statusController.getStatuses);
router.post('/:statusId/view', statusController.viewStatus);
router.get('/:statusId/viewers', statusController.getStatusViewers);

module.exports = router;
