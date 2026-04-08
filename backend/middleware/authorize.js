const prisma = require('../prisma/client');

/**
 * Authorize middleware for granular university course permissions
 * Handles global roles (LECTURER, STUDENT) and course-specific roles (COURSE_REP)
 */
const authorize = (action) => {
  return async (req, res, next) => {
    const userId = req.user.id;
    const globalRole = req.user.role;
    const courseId = req.params.courseId || req.body.courseId || req.params.id;

    if (!courseId) {
      // If no course context, fall back to global role checks for specific sensitive routes
      if (globalRole === 'ADMIN') return next();
      
      const contextlessActions = ['manage_course', 'create_official_announcement', 'create_event'];
      if (contextlessActions.includes(action) && globalRole === 'LECTURER') return next();
      if (action === 'create_event' && globalRole === 'COURSE_REP') return next();
      
      return res.status(403).json({ message: 'Course context required for this action' });
    }

    try {
      const course = await prisma.course.findUnique({
        where: { id: courseId },
        select: { instructorId: true }
      });

      if (!course) {
        return res.status(404).json({ message: 'Course not found' });
      }

      const membership = await prisma.courseMembership.findUnique({
        where: {
          userId_courseId: { userId, courseId }
        }
      });

      // 1. LECTURER of the course has full power
      if (course.instructorId === userId || globalRole === 'ADMIN') {
        return next();
      }

      // 2. Actions that LECTURERS only can do
      const lecturerOnlyActions = ['lock_chat', 'assign_rep', 'upload_material', 'manage_course', 'delete_any_message'];
      if (lecturerOnlyActions.includes(action)) {
        return res.status(403).json({ message: 'Lecturer authority required' });
      }

      // 3. Actions that COURSE REPS can do
      const courseRepActions = ['create_announcement', 'create_event', 'pin_message', 'delete_message_in_course'];
      if (courseRepActions.includes(action)) {
        if (membership?.role === 'COURSE_REP') {
          return next();
        }
        return res.status(403).json({ message: 'Course Representative authority required' });
      }

      // 4. Default STUDENT permissions
      const studentActions = ['send_message', 'view_announcements', 'view_events', 'join_course'];
      if (studentActions.includes(action)) {
        if (membership || action === 'join_course') {
          return next();
        }
      }

      res.status(403).json({ message: `Access Denied: ${action} not permitted for your current role.` });
    } catch (error) {
      console.error('[AUTH ERROR]', error);
      res.status(500).json({ message: 'Auth server error' });
    }
  };
};

module.exports = { authorize };
