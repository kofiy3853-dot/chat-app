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

    // Email domain restriction: ktu.edu.gh only
    if (!email?.toLowerCase().endsWith('@ktu.edu.gh')) {
      return res.status(400).json({ message: 'Access Denied. Only university emails (@ktu.edu.gh) are permitted to join this hub.' });
    }

    // Strict validation: No single line leave blank
    if (!name?.trim() || !email?.trim() || !password?.trim() || !studentId?.trim() || !department?.trim()) {
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

    // Create new user
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
        name,
        studentId,
        department,
        avatar: avatarUrl,
        role: role ? role.toUpperCase() : 'STUDENT'
      }
    });

    console.log(`[REGISTER DEBUG] User created in DB with avatar: ${user.avatar ? 'YES' : 'NO'}`);

    // Generate token
    const token = generateToken(user);

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: userWithoutPassword,
      redirectTo: getRedirectPath(user.role)
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Login user
exports.login = async (req, res) => {
  try {
    console.log("LOGIN BODY:", req.body);

    const { email, password } = req.body;

    if (!email || !password) {
      console.log("Missing fields");
      return res.status(400).json({ message: "Email and password required" });
    }

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

    if (!user) {
      console.log("User not found:", email);
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const valid = await bcrypt.compare(password, user.password);

    if (!valid) {
      console.log("Wrong password for:", email);
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Use our global generateToken instead of redeclaring 
    // to preserve token uniformity (7d etc)
    const token = generateToken(user);
    const { password: _, ...userWithoutPassword } = user;

    console.log("Login success:", email);

    res.json({
      message: 'Login successful',
      token,
      user: userWithoutPassword,
      redirectTo: getRedirectPath(user.role)
    });

  } catch (err) {
    console.error("LOGIN ERROR:", err);
    res.status(500).json({ message: "Server error" });
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
    const { name, department, avatar, status } = req.body;
    
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { name, department, avatar, status },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        role: true,
        studentId: true,
        department: true,
        isOnline: true,
        lastSeen: true,
        status: true,
        createdAt: true,
        updatedAt: true
      }
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
