const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const prisma = require('../prisma/client');
const { validationResult } = require('express-validator');

// Startup check for critical env vars
if (!process.env.JWT_SECRET) {
  console.error('[AUTH FATAL] JWT_SECRET environment variable is not set! Login will fail.');
}
if (!process.env.DIRECT_URL && !process.env.DATABASE_URL) {
  console.error('[AUTH FATAL] No database URL configured! DB queries will fail.');
}

// Generate JWT token
const generateToken = (user) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is not configured on this server.');
  }
  return jwt.sign({ 
    userId: user.id,
    role: user.role 
  }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// --- KTU Department Hub Automation ---
const checkAndJoinDepartmentHub = async (userId, departmentName, tx = prisma) => {
  if (!departmentName || departmentName.trim() === "") return;
  
  try {
    const hubName = `${departmentName.trim()} Hub`;
    
    // Find or Create this specific KTU Hub
    let hub = await tx.conversation.findFirst({
      where: { 
        name: hubName,
        type: 'GROUP'
      }
    });

    if (!hub) {
      console.log(`[HUB AUTO] Creating new hub: ${hubName}`);
      hub = await tx.conversation.create({
        data: {
          name: hubName,
          type: 'GROUP',
          onlyAdminsCanPost: false
        }
      });
    }

    // Ensure student is enrolled
    const existing = await tx.conversationParticipant.findUnique({
      where: {
        userId_conversationId: {
          userId,
          conversationId: hub.id
        }
      }
    });

    if (!existing) {
      console.log(`[HUB AUTO] Enrolling user ${userId} to ${hubName}`);
      await tx.conversationParticipant.create({
        data: {
          userId,
          conversationId: hub.id,
          role: 'MEMBER'
        }
      });
    }
  } catch (err) {
    console.error(`[HUB AUTO ERROR] Failed for ${departmentName}:`, err);
  }
};

const getRedirectPath = (role) => {
  switch (role) {
    case 'ADMIN': return '/admin';
    case 'NANA': return '/nana';
    case 'STUDENT': return '/';
    default: return '/';
  }
};

const uploadToSupabase = require('../utils/uploadToSupabase');

// Register new user
exports.register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorMsg = errors.array()[0].msg || 'Validation failed';
      console.log(`[REGISTER DEBUG] Validation failed: ${errorMsg}`);
      return res.status(400).json({ message: errorMsg, errors: errors.array() });
    }

    const { email, password, name, studentId, department, role } = req.body;
    
    console.log(`[REGISTER ATTEMPT] Name: ${name}, Email: ${email}, Role: ${role}, StudentID: ${studentId}`);

    // Email domain restriction: ktu.edu.gh only (case insensitive)
    const normalizedEmail = email?.trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.endsWith('@stu.ktu.edu.gh') && !normalizedEmail.endsWith('@staff.ktu.edu.gh') && !normalizedEmail.endsWith('@ktu.edu.gh')) {
      return res.status(400).json({ 
        message: 'Access Denied. Registration is restricted to KTU university emails (@stu.ktu.edu.gh, @staff.ktu.edu.gh, or @ktu.edu.gh).' 
      });
    }

    // Strict validation: No single line leave blank
    if (!name?.trim() || !normalizedEmail || !password?.trim() || !studentId?.trim() || !department?.trim()) {
      return res.status(400).json({ message: 'All fields are mandatory. Please fill in all information.' });
    }

    // Profile picture check
    if (!req.file) {
      return res.status(400).json({ message: 'Profile picture is mandatory. Please upload an image.' });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Parallelize tasks for speed: Upload Avatar + Hash Password
    console.log(`[REGISTER DEBUG] Starting parallel tasks...`);
    const [avatarUrl, hashedPassword] = await Promise.all([
      uploadToSupabase(req.file, 'upload'),
      bcrypt.hash(password, 10)
    ]);
    
    if (!avatarUrl) {
      return res.status(500).json({ message: 'Failed to upload profile picture' });
    }

    const userData = {
      email: email.toLowerCase(),
      password: hashedPassword,
      name,
      studentId,
      department,
      faculty: req.body.faculty || null,
      level: req.body.level || null,
      avatar: avatarUrl,
      role: role ? role.toUpperCase() : 'STUDENT'
    };

    if (req.body.fcmToken) {
      userData.fcmToken = req.body.fcmToken;
    }

    // Create user and join hub in an atomic transaction
    const { user, token } = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: userData
      });

      if (newUser.department) {
        await checkAndJoinDepartmentHub(newUser.id, newUser.department, tx);
      }

      const generatedToken = generateToken(newUser);
      return { user: newUser, token: generatedToken };
    });

    console.log(`[REGISTER DEBUG] User ${user.id} and department hub synced successfully.`);

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: userWithoutPassword,
      redirectTo: getRedirectPath(user.role)
    });
  } catch (error) {
    console.error(`[REGISTER FATAL] Registration failed:`, error);
    
    if (error.code === 'P2021' || error.code === 'P2022' || error.message.includes('fcmToken')) {
      return res.status(500).json({ 
        message: 'Database schema mismatch detected. This server requires a database sync (npx prisma db push).',
        error: 'SCHEMA_OUT_OF_SYNC'
      });
    }

    res.status(500).json({ message: 'Server error during registration', error: error.message });
  }
};

// Login user
exports.login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorMsg = errors.array()[0]?.msg || 'Validation failed';
      return res.status(400).json({ message: errorMsg, errors: errors.array() });
    }

    const { email, password, fcmToken } = req.body;

    // REQUIREMENT 2: Validate inputs
    if (!email || !password) {
      console.warn('[LOGIN] Missing email or password in request body.');
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // REQUIREMENT 5: Ensure JWT_SECRET is defined
    if (!process.env.JWT_SECRET) {
      console.error('[AUTH FATAL] JWT_SECRET is not defined in environment variables.');
      throw new Error('Server environment error: JWT configuration missing');
    }

    // REQUIREMENT 3: User lookup (Using safe select for schema stability)
    const normalizedEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({ 
      where: { email: normalizedEmail },
      select: { id: true, email: true, password: true, role: true, name: true }
    });

    if (!user) {
      console.log(`[LOGIN] User not found: ${normalizedEmail}`);
      // 400 = bad credentials (not a missing Bearer token — avoids client "session expired" handling)
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // REQUIREMENT 4: Password check
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      console.log(`[LOGIN] Invalid password for: ${normalizedEmail}`);
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // FEATURE: Fail-safe FCM token update (From Requirement 2 of previous task)
    if (fcmToken) {
      try {
        await prisma.user.update({
          where: { id: user.id },
          data: { fcmToken: fcmToken }
        });
        console.log(`[FCM] Token updated during login for user ${user.id}`);
      } catch (fcmError) {
        console.warn(`[FCM] Could not update token: ${fcmError.message} (Likely missing DB column)`);
      }
    }

    const token = generateToken(user);
    const { password: _, ...userWithoutPassword } = user;

    console.log(`[LOGIN] Success: ${normalizedEmail}`);
    res.json({
      message: 'Login successful',
      token,
      user: userWithoutPassword
    });

  } catch (err) {
    // REQUIREMENT 6: Log exact error in backend console
    console.error('LOGIN ERROR:', err);

    // REQUIREMENT 7: Mask internal error from the client
    res.status(500).json({ message: 'Server error: An unexpected error occurred during login.' });
  }
};

// Get current user
exports.getMe = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        role: true,
        studentId: true,
        department: true,
        faculty: true,
        level: true,
        isOnline: true,
        lastSeen: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        notifications: {
          where: { isRead: false }
        }
      }
    });

    const userData = {
      ...user,
      unreadNotifications: user.notifications.length
    };
    delete userData.notifications;

    res.json({ user: userData });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update user profile
exports.updateProfile = async (req, res) => {
  try {
    const { name, department, faculty, level, avatar, status } = req.body;
    
    const { user } = await prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id: req.user.id },
        data: { name, department, faculty, level, avatar, status },
        select: {
          id: true, email: true, name: true, avatar: true, role: true,
          studentId: true, department: true, faculty: true, level: true,
          isOnline: true, lastSeen: true, status: true, createdAt: true, updatedAt: true
        }
      });

      if (department) {
        await checkAndJoinDepartmentHub(updatedUser.id, department, tx);
      }

      return { user: updatedUser };
    });

    // Broadcast the update to all connected users
    if (req.io) {
      req.io.emit('user-status-changed', {
        userId: user.id,
        status: user.status,
        name: user.name,
        avatar: user.avatar,
        isOnline: user.isOnline,
        lastSeen: user.lastSeen
      });
    }

    res.json({
      message: 'Profile updated successfully',
      user
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Change password
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });
    
    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password
    await prisma.user.update({
      where: { id: req.user.id },
      data: { password: hashedPassword }
    });

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
