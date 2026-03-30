require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const prisma = require('./prisma/client');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const chatRoutes = require('./routes/chatRoutes');
const courseRoutes = require('./routes/courseRoutes');
const { setupSockets } = require('./sockets');
const turnRoutes = require('./routes/turnRoutes');
const pushRoutes = require('./routes/pushRoutes');

const errorHandler = require('./middleware/errorHandler');

const app = express();

// Ensure upload directories exist
const uploadDirs = ['uploads', 'uploads/files', 'uploads/voice'];
uploadDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Allowed origin patterns
const ALLOWED_ORIGINS = [
  process.env.FRONTEND_URL,
  'https://chat-app-kappa-rose.vercel.app',
  'https://social-networking-mu.vercel.app',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://192.168.23.126:3000',
].filter(Boolean);

// Accept all Vercel preview deployments for this project
const VERCEL_PREVIEW_PATTERN = /^https:\/\/chat-[a-z0-9]+-kofiy3853-dots-projects\.vercel\.app$/;

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. mobile apps, curl, Render health checks)
    if (!origin) return callback(null, true);
    // Allow known production/dev origins
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    // Allow any Vercel preview URL for this project
    if (VERCEL_PREVIEW_PATTERN.test(origin)) return callback(null, true);
    // Block everything else
    callback(new Error(`CORS blocked: ${origin}`));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
const server = http.createServer(app);
const io = new Server(server, { 
  cors: corsOptions,
  transports: ['polling', 'websocket'],
  pingTimeout: 120000, 
  pingInterval: 30000,
  connectTimeout: 45000
});
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Uploads: must use open CORS (no credentials) so browsers can load images/files via <img> tags.
// credentialed CORS (with 'credentials: true') is incompatible with wildcard origin required for media.
app.use('/uploads', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static('uploads'));


// Make prisma and io available to routes
app.use((req, res, next) => {
  req.prisma = prisma;
  req.io = io;
  next();
});

// Health check
app.get('/health', (req, res) => res.status(200).json({ status: 'ok', timestamp: new Date() }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/turn', turnRoutes);
app.use('/api/notifications', pushRoutes);

// Socket.IO setup
setupSockets(io);

// Error handling middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Test database connection
async function startServer() {
  try {
    // Test Prisma connection
    await prisma.$connect();
    console.log('Connected to Supabase PostgreSQL database');
    
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to connect to database:', err);
    process.exit(1);
  }
}

startServer();

module.exports = { io };
