require('dotenv').config();
const Database = require('better-sqlite3');
const crypto = require('crypto');
const path = require('path');

const dbPath = path.join(__dirname, 'dev.db');
console.log('Opening database at:', dbPath);
const db = new Database(dbPath);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Clean all tables first (disable FK constraints during cleanup)
console.log('\n--- Cleaning existing data ---');
db.pragma('foreign_keys = OFF');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();
for (const t of tables) {
  db.prepare(`DELETE FROM "${t.name}"`).run();
  console.log(`  Cleaned: ${t.name}`);
}
db.pragma('foreign_keys = ON');

function uuid() {
  return crypto.randomUUID();
}

function ago(days, hours = 0, minutes = 0) {
  const d = new Date(Date.now() - days * 86400000 - hours * 3600000 - minutes * 60000);
  return d.toISOString();
}

function future(days, hours = 0) {
  const d = new Date(Date.now() + days * 86400000 + hours * 3600000);
  return d.toISOString();
}

const now = () => new Date().toISOString();

try {
  console.log('\n--- Seeding Users ---');
  const insertUser = db.prepare(`
    INSERT INTO "User" (id, email, password, name, avatar, "studentId", "staffId", role, faculty, department, level, phone, "coursesTeaching", "isOnline", "lastSeen", status, "socketId", "fcmToken", "createdAt", "updatedAt")
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const userIds = [];
  const users = [
    { name: 'Admin Nana', email: 'admin@campus.edu', role: 'ADMIN', faculty: null, dept: null, level: null, staffId: 'STAFF001' },
    { name: 'Dr. Kwame Asante', email: 'kwame.asante@campus.edu', role: 'LECTURER', faculty: 'FOE', dept: 'Computer Science', staffId: 'LEC001' },
    { name: 'Prof. Ama Mensah', email: 'ama.mensah@campus.edu', role: 'INSTRUCTOR', faculty: 'EBIS', dept: 'Business Admin', staffId: 'LEC002' },
    { name: 'Mr. Kofi Boateng', email: 'kofi.boateng@campus.edu', role: 'LECTURER', faculty: 'FOE', dept: 'Electrical Engineering', staffId: 'LEC003' },
    { name: 'Efua Darko', email: 'efua@student.campus.edu', role: 'STUDENT', faculty: 'FOE', dept: 'Computer Science', level: '400', studentId: 'CS/21/001' },
    { name: 'Kwesi Appiah', email: 'kwesi@student.campus.edu', role: 'STUDENT', faculty: 'FOE', dept: 'Computer Science', level: '400', studentId: 'CS/21/002' },
    { name: 'Aba Nyarko', email: 'aba@student.campus.edu', role: 'COURSE_REP', faculty: 'EBIS', dept: 'Marketing', level: '300', studentId: 'BA/22/001' },
    { name: 'Yaw Frimpong', email: 'yaw@student.campus.edu', role: 'STUDENT', faculty: 'FOE', dept: 'Computer Science', level: '300', studentId: 'CS/22/003' },
    { name: 'Akosua Bonsu', email: 'akosua@student.campus.edu', role: 'STUDENT', faculty: 'FOE', dept: 'Electrical Engineering', level: '400', studentId: 'EE/21/001' },
    { name: 'Nana Yaa Asantewaa', email: 'nana@student.campus.edu', role: 'STUDENT', faculty: 'FOE', dept: 'Computer Science', level: '200', studentId: 'CS/23/001' },
    { name: 'Kojo Adu', email: 'kojo@student.campus.edu', role: 'STUDENT', faculty: 'EBIS', dept: 'Business Admin', level: '300', studentId: 'BA/22/002' },
    { name: 'Adwoa Serwaa', email: 'adwoa@student.campus.edu', role: 'STUDENT', faculty: 'FOE', dept: 'Computer Science', level: '400', studentId: 'CS/21/004' },
  ];

  for (let i = 0; i < users.length; i++) {
    const u = users[i];
    const id = uuid();
    userIds.push(id);
    insertUser.run(
      id, u.email, '$2b$10$hashedpassword', u.name,
      `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.name.replace(/\s/g, '')}`,
      u.studentId || null, u.staffId || null, u.role,
      u.faculty, u.dept, u.level, null, '[]',
      i < 4 ? 1 : (Math.random() > 0.5 ? 1 : 0),
      ago(Math.floor(Math.random() * 3), Math.floor(Math.random() * 12)),
      i === 0 ? 'Admin' : 'Available',
      null, null, ago(Math.floor(Math.random() * 60) + 30), now()
    );
    console.log(`  + User: ${u.name} (${u.role})`);
  }

  // Aliases for convenience
  const admin = userIds[0];      // Admin Nana
  const kwame = userIds[1];      // Dr. Kwame Asante (CS lecturer)
  const ama = userIds[2];        // Prof. Ama Mensah (Business instructor)
  const kofi = userIds[3];       // Mr. Kofi Boateng (EE lecturer)
  const efua = userIds[4];       // Efua Darko (CS 400)
  const kwesi = userIds[5];      // Kwesi Appiah (CS 400)
  const aba = userIds[6];        // Aba Nyarko (Business 300, COURSE_REP)
  const yaw = userIds[7];        // Yaw Frimpong (CS 300)
  const akosua = userIds[8];     // Akosua Bonsu (EE 400)
  const nanayaa = userIds[9];    // Nana Yaa Asantewaa (CS 200)
  const kojo = userIds[10];      // Kojo Adu (Business 300)
  const adwoa = userIds[11];     // Adwoa Serwaa (CS 400)

  console.log('\n--- Seeding Courses ---');
  const insertCourse = db.prepare(`
    INSERT INTO "Course" (id, code, name, description, semester, year, department, "isActive", "allowStudentChat", "allowFileSharing", "announcementsOnly", "instructorId", "createdAt", "updatedAt")
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const courseIds = [];
  const courses = [
    { code: 'CS401', name: 'Software Engineering', desc: 'Advanced software development methodologies, agile practices, and project management.', sem: 'Semester 2', year: 2025, dept: 'Computer Science', instructor: kwame },
    { code: 'CS301', name: 'Data Structures & Algorithms', desc: 'Complexity analysis, trees, graphs, hash tables, sorting and searching algorithms.', sem: 'Semester 1', year: 2025, dept: 'Computer Science', instructor: kwame },
    { code: 'CS201', name: 'Object-Oriented Programming', desc: 'Java OOP concepts, design patterns, and software design principles.', sem: 'Semester 2', year: 2025, dept: 'Computer Science', instructor: kwame },
    { code: 'BA301', name: 'Marketing Management', desc: 'Principles of marketing, consumer behavior, and marketing strategies.', sem: 'Semester 1', year: 2025, dept: 'Business Admin', instructor: ama },
    { code: 'EE401', name: 'Power Systems', desc: 'Generation, transmission, and distribution of electrical power.', sem: 'Semester 2', year: 2025, dept: 'Electrical Engineering', instructor: kofi },
  ];

  for (let i = 0; i < courses.length; i++) {
    const c = courses[i];
    const id = uuid();
    courseIds.push(id);
    insertCourse.run(
      id, c.code, c.name, c.desc, c.sem, c.year, c.dept,
      1, 1, 1, 0, c.instructor, ago(90), now()
    );
    console.log(`  + Course: ${c.code} - ${c.name}`);
  }

  const cs401 = courseIds[0];
  const cs301 = courseIds[1];
  const cs201 = courseIds[2];
  const ba301 = courseIds[3];
  const ee401 = courseIds[4];

  console.log('\n--- Seeding Course Memberships ---');
  const insertMembership = db.prepare(`
    INSERT INTO "course_memberships" (id, role, "joinedAt", userId, courseId)
    VALUES (?, ?, ?, ?, ?)
  `);

  const memberships = [
    { userId: efua, courseId: cs401, role: 'STUDENT' },
    { userId: kwesi, courseId: cs401, role: 'STUDENT' },
    { userId: adwoa, courseId: cs401, role: 'STUDENT' },
    { userId: yaw, courseId: cs301, role: 'STUDENT' },
    { userId: nanayaa, courseId: cs201, role: 'STUDENT' },
    { userId: efua, courseId: cs301, role: 'STUDENT' },
    { userId: kwesi, courseId: cs301, role: 'STUDENT' },
    { userId: aba, courseId: ba301, role: 'STUDENT' },
    { userId: kojo, courseId: ba301, role: 'STUDENT' },
    { userId: akosua, courseId: ee401, role: 'STUDENT' },
  ];

  for (const m of memberships) {
    insertMembership.run(uuid(), m.role, ago(Math.floor(Math.random() * 80) + 10), m.userId, m.courseId);
  }
  console.log(`  + ${memberships.length} course memberships`);

  console.log('\n--- Seeding Conversations ---');
  const insertConversation = db.prepare(`
    INSERT INTO "Conversation" (id, type, name, avatar, "lastMessageAt", "isActive", "allowFileSharing", "allowReactions", "onlyAdminsCanPost", "courseId", "createdAt", "updatedAt")
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const convIds = [];
  const convData = [
    { type: 'COURSE', name: 'CS401 - Software Engineering', courseId: cs401 },
    { type: 'COURSE', name: 'CS301 - Data Structures & Algorithms', courseId: cs301 },
    { type: 'COURSE', name: 'CS201 - Object-Oriented Programming', courseId: cs201 },
    { type: 'COURSE', name: 'BA301 - Marketing Management', courseId: ba301 },
    { type: 'GROUP', name: 'CS Final Year Project Group', courseId: null },
    { type: 'GROUP', name: 'EE Lab Partners', courseId: null },
    { type: 'DIRECT', name: null, courseId: null },
    { type: 'DIRECT', name: null, courseId: null },
    { type: 'GROUP', name: 'Campus Dev Club', courseId: null },
  ];

  for (let i = 0; i < convData.length; i++) {
    const c = convData[i];
    const id = uuid();
    convIds.push(id);
    insertConversation.run(
      id, c.type, c.name, c.courseId ? `https://api.dicebear.com/7.x/identicon/svg?seed=${c.name}` : null,
      ago(Math.floor(Math.random() * 5)), 1, 1, 1, 0,
      c.courseId, ago(90), now()
    );
    console.log(`  + Conversation: ${c.name || c.type} (${c.type})`);
  }

  const cs401Conv = convIds[0];
  const cs301Conv = convIds[1];
  const cs201Conv = convIds[2];
  const ba301Conv = convIds[3];
  const projGroupConv = convIds[4];
  const eeLabConv = convIds[5];
  const dm1Conv = convIds[6];
  const dm2Conv = convIds[7];
  const devClubConv = convIds[8];

  console.log('\n--- Seeding Conversation Participants ---');
  const insertParticipant = db.prepare(`
    INSERT INTO "ConversationParticipant" (id, role, "joinedAt", "isArchived", "isDeleted", "clearedAt", userId, conversationId)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const participants = [
    // CS401 course chat
    { userId: kwame, convId: cs401Conv, role: 'OWNER' },
    { userId: efua, convId: cs401Conv, role: 'ADMIN' },
    { userId: kwesi, convId: cs401Conv, role: 'MEMBER' },
    { userId: adwoa, convId: cs401Conv, role: 'MEMBER' },
    // CS301 course chat
    { userId: kwame, convId: cs301Conv, role: 'OWNER' },
    { userId: yaw, convId: cs301Conv, role: 'MEMBER' },
    { userId: efua, convId: cs301Conv, role: 'MEMBER' },
    { userId: kwesi, convId: cs301Conv, role: 'MEMBER' },
    // CS201 course chat
    { userId: kwame, convId: cs201Conv, role: 'OWNER' },
    { userId: nanayaa, convId: cs201Conv, role: 'MEMBER' },
    // BA301 course chat
    { userId: ama, convId: ba301Conv, role: 'OWNER' },
    { userId: aba, convId: ba301Conv, role: 'ADMIN' },
    { userId: kojo, convId: ba301Conv, role: 'MEMBER' },
    // Project group
    { userId: efua, convId: projGroupConv, role: 'OWNER' },
    { userId: kwesi, convId: projGroupConv, role: 'MEMBER' },
    { userId: adwoa, convId: projGroupConv, role: 'MEMBER' },
    { userId: yaw, convId: projGroupConv, role: 'MEMBER' },
    // EE lab partners
    { userId: akosua, convId: eeLabConv, role: 'OWNER' },
    { userId: kofi, convId: eeLabConv, role: 'ADMIN' },
    // DMs
    { userId: efua, convId: dm1Conv, role: 'MEMBER' },
    { userId: kwesi, convId: dm1Conv, role: 'MEMBER' },
    { userId: aba, convId: dm2Conv, role: 'MEMBER' },
    { userId: kojo, convId: dm2Conv, role: 'MEMBER' },
    // Dev club
    { userId: efua, convId: devClubConv, role: 'ADMIN' },
    { userId: kwesi, convId: devClubConv, role: 'MEMBER' },
    { userId: nanayaa, convId: devClubConv, role: 'MEMBER' },
    { userId: yaw, convId: devClubConv, role: 'MEMBER' },
    { userId: adwoa, convId: devClubConv, role: 'MEMBER' },
    { userId: akosua, convId: devClubConv, role: 'MEMBER' },
  ];

  for (const p of participants) {
    insertParticipant.run(
      uuid(), p.role, ago(Math.floor(Math.random() * 80) + 10), 0, 0, null,
      p.userId, p.convId
    );
  }
  console.log(`  + ${participants.length} conversation participants`);

  console.log('\n--- Seeding Messages ---');
  const insertMessage = db.prepare(`
    INSERT INTO "Message" (id, content, type, "fileUrl", "fileName", "fileSize", "editedAt", "isDeleted", "createdAt", "updatedAt", senderId, conversationId, courseId, "replyToId")
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const msgIds = [];
  const messageData = [
    // CS401 course chat messages
    { convId: cs401Conv, senderId: kwame, content: 'Welcome to CS401 Software Engineering! This semester we will cover agile methodologies, CI/CD, and microservices architecture.', type: 'TEXT', daysAgo: 45 },
    { convId: cs401Conv, senderId: kwame, content: '📢 First assignment has been posted. Please review the requirements on the course materials page. Deadline: 2 weeks from today.', type: 'ANNOUNCEMENT', daysAgo: 40 },
    { convId: cs401Conv, senderId: efua, content: 'Thank you Professor! Quick question - should we use Scrum or Kanban for the team project?', type: 'TEXT', daysAgo: 39 },
    { convId: cs401Conv, senderId: kwame, content: 'Great question Efua! You are free to choose either. I recommend Scrum for larger teams and Kanban for smaller ones.', type: 'TEXT', daysAgo: 39 },
    { convId: cs401Conv, senderId: kwesi, content: 'Does anyone want to form a project group? I have experience with React and Node.js.', type: 'TEXT', daysAgo: 35 },
    { convId: cs401Conv, senderId: adwoa, content: 'I\'m interested! I can handle the frontend with React/TypeScript.', type: 'TEXT', daysAgo: 35 },
    { convId: cs401Conv, senderId: efua, content: 'Count me in! I can do backend with Python/FastAPI or Node.js.', type: 'TEXT', daysAgo: 34 },
    { convId: cs401Conv, senderId: efua, content: 'Let\'s set up a GitHub repo and Trello board this weekend.', type: 'TEXT', daysAgo: 30 },
    { convId: cs401Conv, senderId: kwesi, content: 'https://github.com/cs401-team-project\nRepo is ready. Added all of you as collaborators.', type: 'TEXT', daysAgo: 28 },
    { convId: cs401Conv, senderId: kwame, content: 'Remember to push your code regularly and write meaningful commit messages!', type: 'TEXT', daysAgo: 25 },
    { convId: cs401Conv, senderId: adwoa, content: 'Sprint 1 review is tomorrow. Let\'s make sure all user stories are completed.', type: 'TEXT', daysAgo: 20 },
    { convId: cs401Conv, senderId: efua, content: 'Just finished the authentication module. PR is up for review.', type: 'TEXT', daysAgo: 15 },
    { convId: cs401Conv, senderId: kwesi, content: 'Reviewed and approved! The JWT implementation looks solid. Nice work.', type: 'TEXT', daysAgo: 14 },
    { convId: cs401Conv, senderId: kwame, content: 'Mid-semester exam schedule has been released. Check the university portal.', type: 'TEXT', daysAgo: 10 },
    { convId: cs401Conv, senderId: efua, content: 'Final project demo is next week. Let\'s do a practice run today at 4pm in the CS lab.', type: 'TEXT', daysAgo: 5 },
    { convId: cs401Conv, senderId: kwesi, content: 'I\'ll be there! Bringing my laptop with the latest build.', type: 'TEXT', daysAgo: 4 },
    { convId: cs401Conv, senderId: adwoa, content: 'See you all there. Don\'t forget to update the presentation slides!', type: 'TEXT', daysAgo: 3 },
    { convId: cs401Conv, senderId: kwame, content: 'Excellent work on the project everyone! You all deserve high marks. Enjoy the break! 🎉', type: 'TEXT', daysAgo: 1 },

    // CS301 course chat messages
    { convId: cs301Conv, senderId: kwame, content: 'Today we will discuss Big O notation and time complexity analysis.', type: 'TEXT', daysAgo: 50 },
    { convId: cs301Conv, senderId: kwame, content: 'Homework: Implement a balanced BST and analyze its operations. Due next Monday.', type: 'TEXT', daysAgo: 45 },
    { convId: cs301Conv, senderId: yaw, content: 'Professor, can we use AVL trees or do you prefer Red-Black trees?', type: 'TEXT', daysAgo: 44 },
    { convId: cs301Conv, senderId: kwame, content: 'Either is fine. AVL is simpler to implement for this exercise.', type: 'TEXT', daysAgo: 44 },
    { convId: cs301Conv, senderId: efua, content: 'Has anyone started on the graph algorithms assignment? The Dijkstra implementation is tricky.', type: 'TEXT', daysAgo: 30 },
    { convId: cs301Conv, senderId: kwesi, content: 'I used a priority queue with a min-heap. Makes it much cleaner.', type: 'TEXT', daysAgo: 29 },
    { convId: cs301Conv, senderId: yaw, content: 'Thanks for the tip! That approach reduced my code by 40 lines.', type: 'TEXT', daysAgo: 28 },
    { convId: cs301Conv, senderId: efua, content: 'Mid-semester exam review session: Thursday 6pm, Room 204. Who\'s coming?', type: 'TEXT', daysAgo: 20 },
    { convId: cs301Conv, senderId: yaw, content: 'I\'ll be there! Should I bring practice problems?', type: 'TEXT', daysAgo: 19 },

    // CS201 course chat
    { convId: cs201Conv, senderId: kwame, content: 'Welcome to OOP! We\'ll start with classes, objects, and encapsulation in Java.', type: 'TEXT', daysAgo: 60 },
    { convId: cs201Conv, senderId: nanayaa, content: 'Professor, is Java the only language we can use for assignments?', type: 'TEXT', daysAgo: 55 },
    { convId: cs201Conv, senderId: kwame, content: 'For this course, yes. Java is the best language to learn OOP concepts.', type: 'TEXT', daysAgo: 55 },
    { convId: cs201Conv, senderId: nanayaa, content: 'Assignment 2 is posted! Inheritance and polymorphism exercise. Due in 10 days.', type: 'TEXT', daysAgo: 30 },

    // BA301 Marketing chat
    { convId: ba301Conv, senderId: ama, content: 'Welcome to Marketing Management! This course covers the 4 Ps and digital marketing strategies.', type: 'TEXT', daysAgo: 40 },
    { convId: ba301Conv, senderId: aba, content: 'Hello everyone! As your course rep, I\'ll keep everyone updated on deadlines.', type: 'TEXT', daysAgo: 39 },
    { convId: ba301Conv, senderId: kojo, content: 'Anyone interested in forming a group for the brand analysis project?', type: 'TEXT', daysAgo: 30 },
    { convId: ba301Conv, senderId: aba, content: 'Let\'s do it! We need 4-5 people. DM me if interested.', type: 'TEXT', daysAgo: 29 },
    { convId: ba301Conv, senderId: ama, content: 'Guest lecture next Wednesday: Digital Marketing in Ghana\'s Tech Industry. Don\'t miss it!', type: 'TEXT', daysAgo: 15 },

    // Project group messages
    { convId: projGroupConv, senderId: efua, content: 'Team, let\'s finalize the project scope. I suggest we build a campus resource management system.', type: 'TEXT', daysAgo: 32 },
    { convId: projGroupConv, senderId: kwesi, content: 'Sounds good! I can handle the REST API with Express.js and PostgreSQL.', type: 'TEXT', daysAgo: 32 },
    { convId: projGroupConv, senderId: adwoa, content: 'I\'ll set up the React frontend with Tailwind CSS. Already created the wireframes in Figma.', type: 'TEXT', daysAgo: 31 },
    { convId: projGroupConv, senderId: yaw, content: 'I can do the database design and write unit tests.', type: 'TEXT', daysAgo: 31 },
    { convId: projGroupConv, senderId: efua, content: 'Perfect! Let\'s use Git branching: main → develop → feature branches. PR reviews required.', type: 'TEXT', daysAgo: 30 },
    { convId: projGroupConv, senderId: kwesi, content: 'Sprint 2 retrospective: What went well, what can improve?', type: 'TEXT', daysAgo: 18 },
    { convId: projGroupConv, senderId: adwoa, content: 'The API integration went smoother this sprint. We should keep using the mock server approach.', type: 'TEXT', daysAgo: 17 },
    { convId: projGroupConv, senderId: efua, content: 'Code freeze is Friday. Make sure all features are merged and tested.', type: 'TEXT', daysAgo: 7 },

    // EE lab partners
    { convId: eeLabConv, senderId: akosua, content: 'Lab report for Experiment 3 is due tomorrow. Have you finished the calculations?', type: 'TEXT', daysAgo: 10 },
    { convId: eeLabConv, senderId: kofi, content: 'Remember to include the oscilloscope readings in your report.', type: 'TEXT', daysAgo: 9 },

    // DMs
    { convId: dm1Conv, senderId: efua, content: 'Hey Kwesi! Are you coming to the study group tonight?', type: 'TEXT', daysAgo: 5 },
    { convId: dm1Conv, senderId: kwesi, content: 'Yes! I\'ll be there around 7. Bringing snacks.', type: 'TEXT', daysAgo: 5 },
    { convId: dm1Conv, senderId: efua, content: 'Awesome! See you then 😊', type: 'TEXT', daysAgo: 5 },
    { convId: dm2Conv, senderId: aba, content: 'Hey Kojo! Did you submit the marketing assignment?', type: 'TEXT', daysAgo: 8 },
    { convId: dm2Conv, senderId: kojo, content: 'Just finished it! Thanks for reminding me about the deadline.', type: 'TEXT', daysAgo: 8 },

    // Dev club
    { convId: devClubConv, senderId: efua, content: 'Welcome to Campus Dev Club! 🎉 This week: Building a Chrome Extension workshop.', type: 'TEXT', daysAgo: 20 },
    { convId: devClubConv, senderId: nanayaa, content: 'Can we do a workshop on Git and GitHub basics? Many freshers need it.', type: 'TEXT', daysAgo: 18 },
    { convId: devClubConv, senderId: kwesi, content: 'Great idea! I can lead that session next week.', type: 'TEXT', daysAgo: 17 },
    { convId: devClubConv, senderId: yaw, content: 'Who\'s attending the hackathon next month? Team formation starts now!', type: 'TEXT', daysAgo: 10 },
    { convId: devClubConv, senderId: adwoa, content: 'I\'m in! Let\'s aim for the AI/ML track.', type: 'TEXT', daysAgo: 9 },
    { convId: devClubConv, senderId: efua, content: 'Hackathon prep: We need a solid idea by Friday. Brainstorming session Thursday 5pm.', type: 'TEXT', daysAgo: 3 },
  ];

  let lastMsgPerConv = {};
  for (const m of messageData) {
    const id = uuid();
    msgIds.push(id);
    lastMsgPerConv[m.convId] = id;
    insertMessage.run(
      id, m.content, m.type, null, null, null, null, 0,
      m.daysAgo ? ago(m.daysAgo) : now(),
      now(), m.senderId, m.convId, null, null
    );
  }
  console.log(`  + ${messageData.length} messages`);

  // Update lastMessageId for each conversation
  const updateConvLastMsg = db.prepare('UPDATE "Conversation" SET "lastMessageId" = ?, "lastMessageAt" = ? WHERE id = ?');
  for (const [convId, msgId] of Object.entries(lastMsgPerConv)) {
    const msg = messageData.find(m => convId.includes(m.convId) || m.convId === convId);
    updateConvLastMsg.run(msgId, msg ? ago(msg.daysAgo) : now(), convId);
  }

  console.log('\n--- Seeding Reactions ---');
  const insertReaction = db.prepare(`INSERT INTO "Reaction" (id, emoji, "createdAt", userId, messageId) VALUES (?, ?, ?, ?, ?)`);
  const emojis = ['👍', '❤️', '😂', '🎉', '🔥', '💯', '👏', '😍'];
  let reactionCount = 0;
  const usedReactions = new Set();
  for (let i = 0; i < msgIds.length; i++) {
    const numReactions = Math.floor(Math.random() * 3);
    const userEmojis = new Set();
    for (let j = 0; j < numReactions; j++) {
      let emoji;
      do { emoji = emojis[Math.floor(Math.random() * emojis.length)]; } while (userEmojis.has(emoji));
      userEmojis.add(emoji);
      const randomUser = userIds[Math.floor(Math.random() * userIds.length)];
      const key = `${randomUser}:${msgIds[i]}`;
      if (!usedReactions.has(key)) {
        usedReactions.add(key);
        insertReaction.run(uuid(), emoji, ago(Math.floor(Math.random() * 30)), randomUser, msgIds[i]);
        reactionCount++;
      }
    }
  }
  console.log(`  + ${reactionCount} reactions`);

  console.log('\n--- Seeding Read Receipts ---');
  const insertReadReceipt = db.prepare(`INSERT INTO "ReadReceipt" (id, "readAt", userId, messageId) VALUES (?, ?, ?, ?)`);
  let readCount = 0;
  for (let i = 0; i < msgIds.length; i++) {
    const numReads = Math.floor(Math.random() * 5);
    const readUsers = new Set();
    for (let j = 0; j < numReads; j++) {
      const randomUser = userIds[Math.floor(Math.random() * userIds.length)];
      if (!readUsers.has(randomUser)) {
        readUsers.add(randomUser);
        insertReadReceipt.run(uuid(), ago(Math.floor(Math.random() * 20)), randomUser, msgIds[i]);
        readCount++;
      }
    }
  }
  console.log(`  + ${readCount} read receipts`);

  console.log('\n--- Seeding Materials ---');
  const insertMaterial = db.prepare(`
    INSERT INTO "Material" (id, title, description, "fileUrl", "fileName", "fileSize", topic, week, "isPinned", "createdAt", "updatedAt", courseId, "uploaderId")
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const materials = [
    { courseId: cs401, uploader: kwame, title: 'Lecture 1: Introduction to Software Engineering', desc: 'Overview of SE concepts, history, and modern practices.', file: 'Lecture_01_Intro_SE.pdf', size: 2450000, topic: 'Introduction', week: 1, pinned: 1 },
    { courseId: cs401, uploader: kwame, title: 'Lecture 2: Agile Methodologies', desc: 'Scrum, Kanban, and XP frameworks explained.', file: 'Lecture_02_Agile.pdf', size: 3100000, topic: 'Agile', week: 2, pinned: 0 },
    { courseId: cs401, uploader: kwame, title: 'Assignment 1 Requirements', desc: 'Team formation and project proposal guidelines.', file: 'Assignment_01.pdf', size: 450000, topic: 'Assignment', week: 3, pinned: 1 },
    { courseId: cs401, uploader: efua, title: 'Project Proposal Template', desc: 'Template for the final project proposal document.', file: 'Project_Proposal_Template.docx', size: 125000, topic: 'Template', week: 4, pinned: 0 },
    { courseId: cs301, uploader: kwame, title: 'DSA Lecture Notes - Trees', desc: 'Binary trees, BSTs, AVL trees, and Red-Black trees.', file: 'DSA_Trees_Notes.pdf', size: 4200000, topic: 'Trees', week: 5, pinned: 1 },
    { courseId: cs301, uploader: kwame, title: 'Graph Algorithms Cheatsheet', desc: 'BFS, DFS, Dijkstra, and Bellman-Ford algorithms.', file: 'Graph_Algorithms.pdf', size: 1800000, topic: 'Graphs', week: 8, pinned: 0 },
    { courseId: cs201, uploader: kwame, title: 'Java OOP Basics', desc: 'Classes, objects, inheritance, and polymorphism in Java.', file: 'Java_OOP_Basics.pdf', size: 2800000, topic: 'OOP Fundamentals', week: 1, pinned: 1 },
    { courseId: ba301, uploader: ama, title: 'Marketing Mix (4Ps) Overview', desc: 'Product, Price, Place, Promotion analysis framework.', file: 'Marketing_Mix_4Ps.pdf', size: 1900000, topic: 'Marketing Fundamentals', week: 1, pinned: 1 },
    { courseId: ee401, uploader: kofi, title: 'Power Systems Lab Manual', desc: 'Step-by-step guide for all lab experiments.', file: 'Power_Systems_Lab.pdf', size: 5600000, topic: 'Lab', week: 1, pinned: 1 },
  ];

  for (const m of materials) {
    insertMaterial.run(
      uuid(), m.title, m.desc,
      `https://supabase.storage.example/${m.file}`, m.file, m.size,
      m.topic, m.week, m.pinned, ago(90), now(), m.courseId, m.uploader
    );
  }
  console.log(`  + ${materials.length} materials`);

  console.log('\n--- Seeding Assignments ---');
  const insertAssignment = db.prepare(`
    INSERT INTO "Assignment" (id, title, description, deadline, points, attachments, "createdAt", "updatedAt", courseId)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const assignments = [
    { courseId: cs401, title: 'Assignment 1: Team Project Proposal', desc: 'Form a team of 3-4 and submit a project proposal.', deadline: future(-5), points: 100 },
    { courseId: cs401, title: 'Assignment 2: Sprint Retrospective Report', desc: 'Document your team\'s agile process and lessons learned.', deadline: future(10), points: 50 },
    { courseId: cs301, title: 'Assignment 1: BST Implementation', desc: 'Implement a balanced BST with insert, delete, and search operations.', deadline: future(-20), points: 100 },
    { courseId: cs301, title: 'Assignment 2: Graph Algorithms', desc: 'Implement Dijkstra and Bellman-Ford algorithms. Analyze time complexity.', deadline: future(14), points: 100 },
    { courseId: cs201, title: 'Assignment 1: Java OOP Basics', desc: 'Create a class hierarchy for a banking system using Java.', deadline: future(-30), points: 100 },
    { courseId: ba301, title: 'Assignment 1: Brand Analysis', desc: 'Analyze a local brand\'s marketing strategy using the 4Ps framework.', deadline: future(7), points: 100 },
  ];

  const assignmentIds = [];
  for (const a of assignments) {
    const id = uuid();
    assignmentIds.push(id);
    insertAssignment.run(
      id, a.title, a.desc, a.deadline, a.points, null, ago(60), now(), a.courseId
    );
  }
  console.log(`  + ${assignments.length} assignments`);

  console.log('\n--- Seeding Submissions ---');
  const insertSubmission = db.prepare(`
    INSERT INTO "Submission" (id, content, "fileUrl", "fileName", "submittedAt", grade, feedback, assignmentId, studentId)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const submissions = [
    { assignmentId: assignmentIds[0], studentId: efua, content: 'Project proposal for Campus Management System', file: 'Proposal_Efua.pdf', submittedAt: ago(8), grade: 'A', feedback: 'Excellent proposal with clear objectives.' },
    { assignmentId: assignmentIds[0], studentId: kwesi, content: 'Contribution to team proposal - API design section', file: 'Proposal_Kwesi.pdf', submittedAt: ago(8), grade: 'A', feedback: 'Well-researched technical approach.' },
    { assignmentId: assignmentIds[2], studentId: efua, content: 'BST implementation in Java', file: 'BST_Efua.java', submittedAt: ago(25), grade: 'A-', feedback: 'Good implementation but missing some edge cases.' },
    { assignmentId: assignmentIds[2], studentId: yaw, content: 'Balanced BST with AVL rotations', file: 'AVL_Yaw.java', submittedAt: ago(24), grade: 'B+', feedback: 'Solid work. Could improve documentation.' },
    { assignmentId: assignmentIds[4], studentId: nanayaa, content: 'Banking system class hierarchy', file: 'Banking_Nanayaa.java', submittedAt: ago(35), grade: 'A', feedback: 'Clean OOP design with proper encapsulation.' },
  ];

  for (const s of submissions) {
    insertSubmission.run(
      uuid(), s.content, `https://supabase.storage.example/${s.file}`, s.file,
      s.submittedAt, s.grade, s.feedback, s.assignmentId, s.studentId
    );
  }
  console.log(`  + ${submissions.length} submissions`);

  console.log('\n--- Seeding Notifications ---');
  const insertNotification = db.prepare(`
    INSERT INTO "Notification" (id, type, title, content, "isRead", "readAt", "actionUrl", "createdAt", recipientId, senderId, messageId, courseId)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const notifications = [
    { recipientId: efua, type: 'MESSAGE', title: 'New message in CS401', content: 'Kwesi sent a message', isRead: 1, senderId: kwesi, courseId: cs401 },
    { recipientId: kwesi, type: 'ANNOUNCEMENT', title: 'Assignment posted', content: 'Dr. Kwame Asante posted Assignment 2', isRead: 1, senderId: kwame, courseId: cs401 },
    { recipientId: nanayaa, type: 'COURSE_INVITE', title: 'Course invitation', content: 'You have been added to CS201', isRead: 1, senderId: kwame, courseId: cs201 },
    { recipientId: aba, type: 'MESSAGE', title: 'New message in BA301', content: 'Kojo sent a message', isRead: 0, senderId: kojo, courseId: ba301 },
    { recipientId: yaw, type: 'MENTION', title: 'You were mentioned', content: 'Efua mentioned you in CS301', isRead: 0, senderId: efua, courseId: cs301 },
    { recipientId: adwoa, type: 'SYSTEM', title: 'System update', content: 'New features available in the chat', isRead: 1, senderId: null, courseId: null },
    { recipientId: efua, type: 'ANNOUNCEMENT', title: 'Campus event', content: 'Hackathon registration is open', isRead: 0, senderId: admin, courseId: null },
    { recipientId: akosua, type: 'MESSAGE', title: 'New message in EE401', content: 'Mr. Kofi posted an update', isRead: 0, senderId: kofi, courseId: ee401 },
    { recipientId: kwesi, type: 'MESSAGE', title: 'DM from Efua', content: 'Hey, are you coming to the study group?', isRead: 1, senderId: efua, courseId: null },
    { recipientId: nanayaa, type: 'SYSTEM', title: 'Welcome!', content: 'Welcome to Campus Chat! Join your courses to get started.', isRead: 1, senderId: null, courseId: null },
  ];

  for (const n of notifications) {
    insertNotification.run(
      uuid(), n.type, n.title, n.content, n.isRead,
      n.isRead ? ago(Math.floor(Math.random() * 10)) : null,
      null, ago(Math.floor(Math.random() * 20)),
      n.recipientId, n.senderId, null, n.courseId
    );
  }
  console.log(`  + ${notifications.length} notifications`);

  console.log('\n--- Seeding Events ---');
  const insertEvent = db.prepare(`
    INSERT INTO "events" (id, title, description, category, "startTime", "endTime", "locationType", "locationValue", "bannerUrl", "maxAttendees", visibility, "rsvpEnabled", "createdAt", "updatedAt", "creatorId")
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const eventIds = [];
  const events = [
    { creatorId: efua, title: 'Campus Hackathon 2025', desc: '48-hour hackathon focusing on AI/ML solutions for campus problems.', category: 'ACADEMIC', startTime: future(14, 8), endTime: future(16, 18), locType: 'PHYSICAL', loc: 'CS Lab Building A', maxAttendees: 60, visibility: 'PUBLIC' },
    { creatorId: kwame, title: 'Software Engineering Workshop', desc: 'Hands-on workshop on CI/CD pipelines and Docker.', category: 'ACADEMIC', startTime: future(7, 14), endTime: future(7, 17), locType: 'PHYSICAL', loc: 'Lecture Hall 3', maxAttendees: 40, visibility: 'PUBLIC' },
    { creatorId: admin, title: 'Freshers Welcome Party', desc: 'Welcome event for all new students. Meet your department mates!', category: 'SOCIAL', startTime: future(3, 18), endTime: future(3, 22), locType: 'PHYSICAL', loc: 'Student Center', maxAttendees: 200, visibility: 'PUBLIC' },
    { creatorId: efua, title: 'Dev Club Weekly Meeting', desc: 'Regular meeting: Chrome Extension Workshop', category: 'CLUB', startTime: future(2, 16), endTime: future(2, 18), locType: 'PHYSICAL', loc: 'CS Seminar Room', maxAttendees: 30, visibility: 'PUBLIC' },
    { creatorId: kofi, title: 'Power Systems Lab Session', desc: 'Experiment 4: Load flow analysis. Bring your lab manuals.', category: 'ACADEMIC', startTime: future(5, 9), endTime: future(5, 12), locType: 'PHYSICAL', loc: 'EE Lab 2', maxAttendees: 25, visibility: 'PRIVATE' },
    { creatorId: ama, title: 'Guest Lecture: Digital Marketing', desc: 'Speaker: CEO of TechGhana. How digital marketing is evolving in Africa.', category: 'ACADEMIC', startTime: future(10, 10), endTime: future(10, 12), locType: 'ONLINE', loc: 'https://zoom.us/j/123456789', maxAttendees: 100, visibility: 'PUBLIC' },
    { creatorId: yaw, title: 'Football Match: CS vs EE', desc: 'Interdepartmental football match. Come support your team!', category: 'SPORTS', startTime: future(8, 15), endTime: future(8, 17), locType: 'PHYSICAL', loc: 'Main Sports Field', maxAttendees: 50, visibility: 'PUBLIC' },
  ];

  for (const e of events) {
    const id = uuid();
    eventIds.push(id);
    insertEvent.run(
      id, e.title, e.desc, e.category, e.startTime, e.endTime,
      e.locType, e.loc, null, e.maxAttendees, e.visibility, 1,
      ago(30), now(), e.creatorId
    );
  }
  console.log(`  + ${events.length} events`);

  console.log('\n--- Seeding Event Participants ---');
  const insertEventParticipant = db.prepare(`INSERT INTO "event_participants" (id, "joinedAt", eventId, userId) VALUES (?, ?, ?, ?)`);
  let epCount = 0;
  for (const eventId of eventIds) {
    const numParticipants = 2 + Math.floor(Math.random() * 6);
    const eventUsers = new Set();
    for (let i = 0; i < numParticipants; i++) {
      const randomUser = userIds[Math.floor(Math.random() * userIds.length)];
      if (!eventUsers.has(randomUser)) {
        eventUsers.add(randomUser);
        insertEventParticipant.run(uuid(), ago(Math.floor(Math.random() * 20)), eventId, randomUser);
        epCount++;
      }
    }
  }
  console.log(`  + ${epCount} event participants`);

  console.log('\n--- Seeding Announcements ---');
  const insertAnnouncement = db.prepare(`
    INSERT INTO "announcements" (id, title, content, "imageUrl", "createdAt", "updatedAt", userId, "targetCourseId", "targetDepartment", "targetAll")
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const announcements = [
    { userId: admin, title: 'Mid-Semester Break Schedule', content: 'The mid-semester break will run from March 15-22. All classes will resume on March 23.', targetAll: 1 },
    { userId: kwame, title: 'CS Department: Lab Access Extended', content: 'CS labs will now be open until 10pm on weekdays for project work.', targetAll: 0, targetDept: 'Computer Science' },
    { userId: admin, title: 'Library Hours Updated', content: 'The university library will now operate from 7am to 11pm during exam period.', targetAll: 1 },
    { userId: ama, title: 'EBIS Career Fair', content: 'Annual career fair for Business students. Bring your CVs!', targetAll: 0, targetDept: 'Business Admin' },
    { userId: kwame, title: 'CS401 Final Project Submission', content: 'Reminder: Final project submission deadline is next Friday. Submit via the course portal.', targetAll: 0, targetCourse: cs401 },
  ];

  for (const a of announcements) {
    insertAnnouncement.run(
      uuid(), a.title, a.content, null,
      ago(Math.floor(Math.random() * 30)), now(),
      a.userId, a.targetCourse || null, a.targetDept || null, a.targetAll
    );
  }
  console.log(`  + ${announcements.length} announcements`);

  console.log('\n--- Seeding Statuses ---');
  const insertStatus = db.prepare(`
    INSERT INTO "Status" (id, type, "contentUrl", "textContent", "backgroundColor", caption, "createdAt", "expiresAt", userId)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const statusIds = [];
  const statuses = [
    { userId: efua, type: 'TEXT', text: 'Working on the final project! Almost done 🎯', bg: '#6B73FF', caption: null, daysAgo: 1 },
    { userId: kwesi, type: 'TEXT', text: 'Just pushed the last commit. Time to relax!', bg: '#FF6B6B', caption: null, daysAgo: 2 },
    { userId: nanayaa, type: 'IMAGE', text: null, bg: null, caption: 'Study vibes at the library 📚', daysAgo: 3 },
    { userId: aba, type: 'TEXT', text: 'Marketing assignment done! Who else is submitting today?', bg: '#4ECDC4', caption: null, daysAgo: 4 },
    { userId: adwoa, type: 'TEXT', text: 'Excited for the hackathon next week!', bg: '#FFE66D', caption: null, daysAgo: 5 },
    { userId: yaw, type: 'TEXT', text: 'CS301 exam prep mode activated 📖', bg: '#95E1D3', caption: null, daysAgo: 6 },
  ];

  for (const s of statuses) {
    const id = uuid();
    statusIds.push(id);
    insertStatus.run(
      id, s.type, s.type === 'IMAGE' ? 'https://picsum.photos/400/600' : null,
      s.text, s.bg, s.caption,
      ago(s.daysAgo), ago(s.daysAgo - 1), s.userId
    );
  }
  console.log(`  + ${statuses.length} statuses`);

  console.log('\n--- Seeding Status Views ---');
  const insertStatusView = db.prepare(`INSERT INTO "StatusView" (id, "viewedAt", statusId, "viewerId") VALUES (?, ?, ?, ?)`);
  let svCount = 0;
  for (const statusId of statusIds) {
    const numViews = 2 + Math.floor(Math.random() * 8);
    const viewUsers = new Set();
    for (let i = 0; i < numViews; i++) {
      const randomUser = userIds[Math.floor(Math.random() * userIds.length)];
      if (!viewUsers.has(randomUser)) {
        viewUsers.add(randomUser);
        insertStatusView.run(uuid(), ago(Math.floor(Math.random() * 5)), statusId, randomUser);
        svCount++;
      }
    }
  }
  console.log(`  + ${svCount} status views`);

  console.log('\n--- Seeding Anonymous Posts ---');
  const insertAnonPost = db.prepare(`INSERT INTO "anonymous_posts" (id, content, tags, "createdAt", userId) VALUES (?, ?, ?, ?, ?)`);

  const anonPosts = [
    { content: 'Is it just me or is the WiFi in the CS lab getting worse every day? I can barely load a page during peak hours.', tags: 'wifi,complaint', userId: efua },
    { content: 'Shoutout to Dr. Asante for making Software Engineering actually fun! Best course this semester.', tags: 'shoutout,academic', userId: kwesi },
    { content: 'Does anyone know if the cafeteria will be open during the mid-semester break?', tags: 'question,facilities', userId: nanayaa },
    { content: 'Looking for a study group for the DTA exam. Anyone interested? Drop a comment.', tags: 'study,academic', userId: yaw },
    { content: 'The new library extension is amazing! Finally enough power outlets for everyone.', tags: 'facilities,positive', userId: adwoa },
    { content: 'Why do some lecturers still use chalkboards when we have smart boards? It\'s 2025!', tags: 'complaint,academic', userId: kojo },
    { content: 'Found: One USB drive near the CS lab entrance. DM me to claim it.', tags: 'lost-found', userId: aba },
  ];

  for (const p of anonPosts) {
    insertAnonPost.run(uuid(), p.content, p.tags, ago(Math.floor(Math.random() * 15)), p.userId);
  }
  console.log(`  + ${anonPosts.length} anonymous posts`);

  console.log('\n✅ Database seeded successfully!');
  console.log(`\nSummary:`);
  console.log(`  Users: ${users.length}`);
  console.log(`  Courses: ${courses.length}`);
  console.log(`  Conversations: ${convData.length}`);
  console.log(`  Messages: ${messageData.length}`);
  console.log(`  Materials: ${materials.length}`);
  console.log(`  Assignments: ${assignments.length}`);
  console.log(`  Submissions: ${submissions.length}`);
  console.log(`  Notifications: ${notifications.length}`);
  console.log(`  Events: ${events.length}`);
  console.log(`  Announcements: ${announcements.length}`);
  console.log(`  Statuses: ${statuses.length}`);
  console.log(`  Anonymous Posts: ${anonPosts.length}`);

} catch (error) {
  console.error('Error:', error.message);
  console.error(error.stack);
} finally {
  db.close();
}
