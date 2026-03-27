const prisma = require('../prisma/client');

// Get all courses for user
exports.getCourses = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    let courses;
    if (userRole === 'INSTRUCTOR' || userRole === 'ADMIN') {
      courses = await prisma.course.findMany({
        where: { instructorId: userId },
        include: {
          instructor: { select: { id: true, name: true, avatar: true } },
          students: { select: { id: true, name: true, avatar: true } }
        },
        orderBy: { createdAt: 'desc' }
      });
    } else {
      courses = await prisma.course.findMany({
        where: { students: { some: { id: userId } } },
        include: {
          instructor: { select: { id: true, name: true, avatar: true } },
          students: { select: { id: true, name: true, avatar: true } }
        },
        orderBy: { createdAt: 'desc' }
      });
    }

    res.json({ courses });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get course by ID
exports.getCourseById = async (req, res) => {
  try {
    const course = await prisma.course.findUnique({
      where: { id: req.params.id },
      include: {
        instructor: { select: { id: true, name: true, avatar: true, email: true } },
        students: { select: { id: true, name: true, avatar: true, email: true, studentId: true } },
        conversation: {
          select: { id: true, name: true, type: true }
        }
      }
    });

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Check if user has access
    const userId = req.user.id;
    const isInstructor = course.instructorId === userId;
    const isStudent = course.students.some(s => s.id === userId);

    if (!isInstructor && !isStudent && req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({ course });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Create new course (instructor/admin only)
exports.createCourse = async (req, res) => {
  try {
    if (req.user.role === 'STUDENT') {
      return res.status(403).json({ message: 'Only instructors can create courses' });
    }

    const { code, name, description, semester, year, department } = req.body;

    // Check if course code already exists
    const existingCourse = await prisma.course.findUnique({
      where: { code }
    });
    if (existingCourse) {
      return res.status(400).json({ message: 'Course code already exists' });
    }

    // Create course and conversation in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const course = await tx.course.create({
        data: {
          code,
          name,
          description,
          instructorId: req.user.id,
          semester,
          year: parseInt(year),
          department
        }
      });

      const conversation = await tx.conversation.create({
        data: {
          type: 'COURSE',
          name: `${code} - ${name}`,
          courseId: course.id,
          participants: {
            create: {
              userId: req.user.id,
              role: 'OWNER'
            }
          }
        }
      });

      return await tx.course.findUnique({
        where: { id: course.id },
        include: {
          instructor: { select: { id: true, name: true, avatar: true } },
          conversation: true
        }
      });
    });

    res.status(201).json({ course: result });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Join course (student)
exports.joinCourse = async (req, res) => {
  try {
    const { courseCode } = req.body;
    const userId = req.user.id;

    const course = await prisma.course.findUnique({
      where: { code: courseCode },
      include: { 
        students: { select: { id: true } },
        conversation: true
      }
    });
    
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Check if already enrolled
    if (course.students.some(s => s.id === userId)) {
      return res.status(400).json({ message: 'Already enrolled in this course' });
    }

    // Add student to course and conversation
    await prisma.$transaction([
      prisma.course.update({
        where: { id: course.id },
        data: { students: { connect: { id: userId } } }
      }),
      prisma.conversationParticipant.create({
        data: {
          userId: userId,
          conversationId: course.conversation.id,
          role: 'MEMBER'
        }
      })
    ]);

    const populatedCourse = await prisma.course.findUnique({
      where: { id: course.id },
      include: {
        instructor: { select: { id: true, name: true, avatar: true } },
        students: { select: { id: true, name: true, avatar: true } }
      }
    });

    res.json({ 
      message: 'Successfully joined course',
      course: populatedCourse 
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Leave course
exports.leaveCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const course = await prisma.course.findUnique({
      where: { id },
      include: { conversation: true }
    });
    
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Remove student from course and conversation
    await prisma.$transaction([
      prisma.course.update({
        where: { id },
        data: { students: { disconnect: { id: userId } } }
      }),
      prisma.conversationParticipant.delete({
        where: {
          userId_conversationId: {
            userId: userId,
            conversationId: course.conversation.id
          }
        }
      })
    ]);

    res.json({ message: 'Successfully left course' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update course settings (instructor only)
exports.updateCourseSettings = async (req, res) => {
  try {
    const { id } = req.params;
    const { settings } = req.body;

    const course = await prisma.course.findUnique({
      where: { id }
    });
    
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Check if user is instructor
    if (course.instructorId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Only instructor can update course settings' });
    }

    const updatedCourse = await prisma.course.update({
      where: { id },
      data: {
        allowStudentChat: settings.allowStudentChat,
        allowFileSharing: settings.allowFileSharing,
        announcementsOnly: settings.announcementsOnly
      }
    });

    res.json({ 
      message: 'Course settings updated',
      settings: {
        allowStudentChat: updatedCourse.allowStudentChat,
        allowFileSharing: updatedCourse.allowFileSharing,
        announcementsOnly: updatedCourse.announcementsOnly
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Remove student from course (instructor only)
exports.removeStudent = async (req, res) => {
  try {
    const { id, studentId } = req.params;

    const course = await prisma.course.findUnique({
      where: { id },
      include: { conversation: true }
    });
    
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Check if user is instructor
    if (course.instructorId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Only instructor can remove students' });
    }

    // Remove student from course and conversation
    await prisma.$transaction([
      prisma.course.update({
        where: { id },
        data: { students: { disconnect: { id: studentId } } }
      }),
      prisma.conversationParticipant.delete({
        where: {
          userId_conversationId: {
            userId: studentId,
            conversationId: course.conversation.id
          }
        }
      })
    ]);

    res.json({ message: 'Student removed from course' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

