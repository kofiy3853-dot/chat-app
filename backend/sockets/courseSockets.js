const prisma = require('../prisma/client');

const setupCourseSockets = (io) => {
  io.on('connection', (socket) => {
    
    // Join course room
    socket.on('join-course', async (courseId) => {
      try {
        const course = await prisma.course.findUnique({
          where: { id: courseId },
          include: { students: { select: { id: true } } }
        });
        
        if (!course) {
          return socket.emit('error', { message: 'Course not found' });
        }

        // Check if user has access
        const userId = socket.user.id;
        const hasAccess = course.instructorId === userId || 
                          course.students.some(s => s.id === userId);

        if (!hasAccess && socket.user.role !== 'ADMIN') {
          return socket.emit('error', { message: 'Access denied' });
        }

        socket.join(`course:${courseId}`);
        socket.emit('joined-course', { courseId });
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    // Leave course room
    socket.on('leave-course', (courseId) => {
      socket.leave(`course:${courseId}`);
      socket.emit('left-course', { courseId });
    });

    // Send course announcement
    socket.on('send-announcement', async (data) => {
      try {
        const { courseId, content } = data;

        const course = await prisma.course.findUnique({
          where: { id: courseId },
          include: { students: { select: { id: true } } }
        });
        
        if (!course) {
          return socket.emit('error', { message: 'Course not found' });
        }

        // Only instructor can send announcements
        if (course.instructorId !== socket.user.id && 
            socket.user.role !== 'ADMIN') {
          return socket.emit('error', { message: 'Only instructor can send announcements' });
        }

        // Create announcement and update conversation in a transaction
        const message = await prisma.$transaction(async (tx) => {
          const m = await tx.message.create({
            data: {
              conversationId: course.conversationId,
              senderId: socket.user.id,
              content,
              type: 'ANNOUNCEMENT'
            },
            include: {
              sender: { select: { id: true, name: true, avatar: true } }
            }
          });

          await tx.conversation.update({
            where: { id: course.conversationId },
            data: {
              lastMessageId: m.id,
              lastMessageAt: new Date()
            }
          });

          // Create notifications for all students
          const notifications = course.students.map(student => ({
            recipientId: student.id,
            type: 'ANNOUNCEMENT',
            title: `New announcement in ${course.code}`,
            content: content.substring(0, 100) + (content.length > 100 ? '...' : ''),
            senderId: socket.user.id,
            courseId: courseId,
            messageId: m.id,
            actionUrl: `/courses/${courseId}`
          }));

          await tx.notification.createMany({
            data: notifications
          });

          return m;
        });

        // Broadcast to course room
        io.to(`course:${courseId}`).emit('new-announcement', {
          message,
          courseId
        });

        // Send real-time notifications to students by creating DB Notification first
        for (const student of course.students) {
          if (student.id === socket.user.id) continue;

          const notification = await prisma.notification.create({
            data: {
              type: 'ANNOUNCEMENT',
              title: `New announcement in ${course.code}`,
              content: content.length > 50 ? content.substring(0, 50) + '...' : content,
              recipientId: student.id,
              senderId: socket.user.id,
              courseId: courseId,
              messageId: message.id,
              actionUrl: `/courses/${courseId}`
            }
          });

          const unreadCount = await prisma.notification.count({
            where: { recipientId: student.id, isRead: false }
          });

          io.to(`user:${student.id}`).emit('new-notification', {
            notification,
            unreadCount
          });
        }

        socket.emit('announcement-sent', { message });
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    // Student joined course
    socket.on('student-joined', async (data) => {
      try {
        const { courseId, studentId } = data;

        const course = await prisma.course.findUnique({
          where: { id: courseId },
          select: { code: true, instructorId: true }
        });
        
        if (!course) return;

        // Notify instructor
        io.to(`user:${course.instructorId}`).emit('student-joined', {
          courseId,
          studentId,
          courseCode: course.code
        });

        // Notify course room
        socket.to(`course:${courseId}`).emit('course-activity', {
          type: 'student-joined',
          studentId,
          timestamp: new Date()
        });
      } catch (error) {
        console.error('Student joined notification error:', error);
      }
    });

    // Course settings updated
    socket.on('course-settings-updated', async (data) => {
      try {
        const { courseId, settings } = data;

        const course = await prisma.course.findUnique({
          where: { id: courseId }
        });
        
        if (!course) return;

        // Only instructor can update settings
        if (course.instructorId !== socket.user.id) return;

        // Broadcast to all course members
        io.to(`course:${courseId}`).emit('course-settings-changed', {
          courseId,
          settings,
          updatedBy: socket.user.id
        });
      } catch (error) {
        console.error('Course settings update error:', error);
      }
    });

  });
};

module.exports = { setupCourseSockets };


module.exports = { setupCourseSockets };
