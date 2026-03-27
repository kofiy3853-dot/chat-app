const express = require('express');
const router = express.Router();
const courseController = require('../controllers/courseController');
const { authMiddleware } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authMiddleware);

router.get('/', courseController.getCourses);
router.post('/', courseController.createCourse);
router.get('/:id', courseController.getCourseById);
router.post('/join', courseController.joinCourse);
router.put('/:id/leave', courseController.leaveCourse);
router.put('/:id/settings', courseController.updateCourseSettings);
router.delete('/:id/students/:studentId', courseController.removeStudent);

module.exports = router;
