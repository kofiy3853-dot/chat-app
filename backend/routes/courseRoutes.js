const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router();
const courseController = require('../controllers/courseController');
const { authMiddleware } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/authorize');

// All routes require authentication
router.use(authMiddleware);

// Validation middleware
const createCourseValidation = [
  body('code').isString().trim().isLength({ min: 2, max: 20 }).withMessage('Course code required'),
  body('name').isString().trim().isLength({ min: 2, max: 200 }).withMessage('Course name required'),
  body('semester').isString().trim().notEmpty().withMessage('Semester required'),
  body('year').isInt({ min: 2020, max: 2030 }).withMessage('Valid year required'),
  body('description').optional().isString().trim().isLength({ max: 1000 })
];

const joinCourseValidation = [
  body('courseCode').isString().trim().isLength({ min: 2, max: 20 }).withMessage('Course code required')
];

const createAssignmentValidation = [
  body('title').isString().trim().isLength({ min: 1, max: 200 }).withMessage('Title required'),
  body('description').optional().isString().trim().isLength({ max: 2000 }),
  body('deadline').isISO8601().withMessage('Valid deadline required'),
  body('points').optional().isInt({ min: 1, max: 1000 })
];

const materialValidation = [
  body('title').isString().trim().isLength({ min: 1, max: 200 }).withMessage('Title required'),
  body('description').optional().isString().trim().isLength({ max: 1000 }),
  body('topic').optional().isString().trim().isLength({ max: 100 }),
  body('week').optional().isInt({ min: 1, max: 20 })
];

router.get('/', courseController.getCourses);
router.post('/', createCourseValidation, authorize('manage_course'), courseController.createCourse);
router.get('/:id', courseController.getCourseById);
router.post('/join', joinCourseValidation, courseController.joinCourse);
router.put('/:id/leave', courseController.leaveCourse);
router.put('/:id/settings', authorize('manage_course'), courseController.updateCourseSettings);
router.delete('/:id/students/:studentId', authorize('manage_course'), courseController.removeStudent);

const upload = require('../middleware/uploadMiddleware');

// Materials
router.get('/:id/materials', authorize('view_materials'), courseController.getMaterials);
router.post('/:id/materials', materialValidation, authorize('upload_material'), upload.single('file'), courseController.addMaterial);
router.delete('/:courseId/materials/:materialId', authorize('upload_material'), courseController.deleteMaterial);

// Assignments
router.get('/:id/assignments', authorize('view_assignments'), courseController.getAssignments);
router.post('/:id/assignments', createAssignmentValidation, authorize('manage_course'), courseController.createAssignment);
router.post('/assignments/:assignmentId/submit', upload.single('file'), courseController.submitAssignment);
router.get('/assignments/:assignmentId/submissions', authorize('manage_course'), courseController.getSubmissions);
router.post('/:id/announcements', authorize('create_announcement'), courseController.postAnnouncement);

// Special Actions
router.post('/:id/assign-rep', authorize('manage_course'), courseController.assignCourseRep);
router.put('/:id/lock', authorize('manage_course'), courseController.lockChat);

module.exports = router;
