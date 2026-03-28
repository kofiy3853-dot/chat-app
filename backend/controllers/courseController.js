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
          year: parseInt(year) || new Date().getFullYear(),
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
    }, { timeout: 15000 });

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

// Get materials for course
exports.getMaterials = async (req, res) => {
  try {
    const materials = await prisma.material.findMany({
      where: { courseId: req.params.id },
      include: { 
        uploader: { select: { id: true, name: true, avatar: true } } 
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ materials });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Add material to course (instructor only)
exports.addMaterial = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, topic, week } = req.body;
    const userId = req.user.id;

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const course = await prisma.course.findUnique({
      where: { id },
      include: { students: true }
    });

    if (course.instructorId !== userId && req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Only instructors can add materials' });
    }

    const material = await prisma.material.create({
      data: {
        title,
        description,
        topic,
        week: week ? parseInt(week) : null,
        fileUrl: `/uploads/files/${req.file.filename}`,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        courseId: id,
        uploaderId: userId
      },
      include: { 
        uploader: { select: { id: true, name: true, avatar: true } } 
      }
    });

    // Notify students via socket
    if (req.io) {
      req.io.to(`course:${id}`).emit('new-material', { material, courseId: id });
    }

    res.status(201).json({ material });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete material
exports.deleteMaterial = async (req, res) => {
  try {
    const { materialId } = req.params;
    const material = await prisma.material.findUnique({ where: { id: materialId } });

    if (!material) return res.status(404).json({ message: 'Material not found' });
    if (material.uploaderId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Access denied' });
    }

    await prisma.material.delete({ where: { id: materialId } });
    res.json({ message: 'Material deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get assignments
exports.getAssignments = async (req, res) => {
  try {
    const assignments = await prisma.assignment.findMany({
      where: { courseId: req.params.id },
      include: {
        submissions: {
          where: { studentId: req.user.id }
        }
      },
      orderBy: { deadline: 'asc' }
    });
    res.json({ assignments });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Create assignment (instructor only)
exports.createAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, deadline, points } = req.body;

    const course = await prisma.course.findUnique({ where: { id } });
    if (course.instructorId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const assignment = await prisma.assignment.create({
      data: {
        title,
        description,
        deadline: new Date(deadline),
        points: parseInt(points),
        courseId: id
      }
    });

    // Notify students
    if (req.io) {
       req.io.to(`course:${id}`).emit('new-assignment', { assignment, courseId: id });
    }

    res.status(201).json({ assignment });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Submit assignment
exports.submitAssignment = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    const submission = await prisma.submission.upsert({
      where: {
        assignmentId_studentId: {
          assignmentId,
          studentId: userId
        }
      },
      update: {
        content,
        fileUrl: req.file ? `/uploads/submissions/${req.file.filename}` : undefined,
        fileName: req.file ? req.file.originalname : undefined,
        submittedAt: new Date()
      },
      create: {
        assignmentId,
        studentId: userId,
        content,
        fileUrl: req.file ? `/uploads/submissions/${req.file.filename}` : undefined,
        fileName: req.file ? req.file.originalname : undefined,
      }
    });

    res.status(201).json({ submission });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get submissions (instructor only)
exports.getSubmissions = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: { course: true }
    });

    if (assignment.course.instructorId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const submissions = await prisma.submission.findMany({
      where: { assignmentId },
      include: {
        student: { select: { id: true, name: true, avatar: true, studentId: true } }
      }
    });

    res.json({ submissions });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Post announcement (instructor only)
exports.postAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    const course = await prisma.course.findUnique({
      where: { id },
      include: { conversation: true }
    });

    if (!course) return res.status(404).json({ message: 'Course not found' });
    if (course.instructorId !== userId && req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Only instructors can post announcements' });
    }

    if (!course.conversation) {
       return res.status(400).json({ message: 'Course conversation not found' });
    }

    const announcement = await prisma.message.create({
      data: {
        content,
        type: 'ANNOUNCEMENT',
        senderId: userId,
        conversationId: course.conversation.id,
        courseId: id
      },
      include: {
        sender: { select: { id: true, name: true, avatar: true } }
      }
    });

    // Notify students via socket
    if (req.io) {
      req.io.to(`course:${id}`).emit('new-announcement', { announcement, courseId: id });
    }

    res.status(201).json({ message: announcement });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
