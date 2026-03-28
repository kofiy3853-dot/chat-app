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
        console.log(`[NOTIF DEBUG] send-announcement from user:${socket.user.id} for course:${courseId}`);
        const course = await prisma.course.findUnique({
          where: { id: courseId },
          include: { 
            students: { select: { id: true } },
            conversation: { select: { id: true } }
          }
        });
        
        if (!course) {
          console.warn(`[NOTIF DEBUG] Course ${courseId} not found.`);
          return socket.emit('error', { message: 'Course not found' });
        }
        console.log(`[NOTIF DEBUG] Course found: ${course.code} | conversationId=${course.conversation?.id} | students=${course.students.length}`);

        // Only instructor can send announcements
        if (course.instructorId !== socket.user.id && 
            socket.user.role !== 'ADMIN') {
          console.warn(`[NOTIF DEBUG] Permission denied: user:${socket.user.id} is not instructor of course:${courseId}`);
          return socket.emit('error', { message: 'Only instructor can send announcements' });
        }

        // Create announcement and update conversation in a transaction
        console.log(`[NOTIF DEBUG] Creating announcement message in conversation:${course.conversation.id}`);
        const message = await prisma.$transaction(async (tx) => {
          const m = await tx.message.create({
            data: {
              conversationId: course.conversation.id,
              senderId: socket.user.id,
              content,
              type: 'ANNOUNCEMENT'
            },
            include: {
              sender: { select: { id: true, name: true, avatar: true } }
            }
          });

          await tx.conversation.update({
            where: { id: course.conversation.id },
            data: {
              lastMessageId: m.id,
              lastMessageAt: new Date()
            }
          });

          return m;
        });

        console.log(`[NOTIF DEBUG] Announcement message created: id=${message.id}`);

        // Broadcast to course room
        console.log(`[NOTIF DEBUG] Broadcasting new-announcement to room course:${courseId}`);
        io.to(`course:${courseId}`).emit('new-announcement', {
          message,
          courseId
        });

        // Send real-time notifications to students in parallel
        console.log(`[NOTIF DEBUG] Sending notifications to ${course.students.length} student(s)`);
        await Promise.all(course.students.map(async (student) => {
          if (student.id === socket.user.id) return;

          console.log(`[NOTIF DEBUG] Creating DB notification for student:${student.id}`);
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
          console.log(`[NOTIF DEBUG] DB notification created: id=${notification.id} for student:${student.id}`);

          const unreadCount = await prisma.notification.count({
            where: { recipientId: student.id, isRead: false }
          });

          console.log(`[NOTIF DEBUG] Emitting new-notification to room user:${student.id} | unreadCount=${unreadCount}`);
          io.to(`user:${student.id}`).emit('new-notification', {
            notification,
            unreadCount
          });
        }));

        console.log(`[NOTIF DEBUG] All announcement notifications dispatched.`);
        socket.emit('announcement-sent', { message });
      } catch (error) {
        console.error(`[NOTIF ERROR] send-announcement crashed:`, error);
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

        // Create persistent notification for instructor
        const notification = await prisma.notification.create({
          data: {
            type: 'SYSTEM',
            title: `A student joined ${course.code}`,
            content: `A new student has enrolled in your course.`,
            recipientId: course.instructorId,
            courseId: courseId,
            actionUrl: `/courses/${courseId}`
          }
        });

        const unreadCount = await prisma.notification.count({
          where: { recipientId: course.instructorId, isRead: false }
        });

        // Notify instructor
        io.to(`user:${course.instructorId}`).emit('new-notification', {
          notification,
          unreadCount
        });

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
