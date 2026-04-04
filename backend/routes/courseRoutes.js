const express = require('express');
const router = express.Router();
const courseController = require('../controllers/courseController');
const { authMiddleware } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/authorize');

// All routes require authentication
router.use(authMiddleware);

router.get('/', courseController.getCourses);
router.post('/', authorize('manage_course'), courseController.createCourse);
router.get('/:id', courseController.getCourseById);
router.post('/join', courseController.joinCourse);
router.put('/:id/leave', courseController.leaveCourse);
router.put('/:id/settings', authorize('manage_course'), courseController.updateCourseSettings);
router.delete('/:id/students/:studentId', authorize('manage_course'), courseController.removeStudent);

const upload = require('../middleware/uploadMiddleware');

// Materials
router.get('/:id/materials', courseController.getMaterials);
router.post('/:id/materials', authorize('upload_material'), upload.single('file'), courseController.addMaterial);
router.delete('/:courseId/materials/:materialId', authorize('upload_material'), courseController.deleteMaterial);

// Assignments
router.get('/:id/assignments', courseController.getAssignments);
router.post('/:id/assignments', authorize('manage_course'), courseController.createAssignment);
router.post('/assignments/:assignmentId/submit', upload.single('file'), courseController.submitAssignment);
router.get('/assignments/:assignmentId/submissions', authorize('manage_course'), courseController.getSubmissions);
router.post('/:id/announcements', authorize('create_announcement'), courseController.postAnnouncement);

// Special Actions
router.post('/:id/assign-rep', authorize('manage_course'), courseController.assignCourseRep);
router.put('/:id/lock', authorize('manage_course'), courseController.lockChat);

module.exports = router;
