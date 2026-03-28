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

const upload = require('../middleware/uploadMiddleware');

// Materials
router.get('/:id/materials', courseController.getMaterials);
router.post('/:id/materials', upload.single('file'), courseController.addMaterial);
router.delete('/:courseId/materials/:materialId', courseController.deleteMaterial);

// Assignments
router.get('/:id/assignments', courseController.getAssignments);
router.post('/:id/assignments', courseController.createAssignment);
router.post('/assignments/:assignmentId/submit', upload.single('file'), courseController.submitAssignment);
router.get('/assignments/:assignmentId/submissions', courseController.getSubmissions);
router.post('/:id/announcements', courseController.postAnnouncement);

module.exports = router;
