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

const errorHandler = require('./middleware/errorHandler');

const app = express();

// Ensure upload directories exist
const uploadDirs = ['uploads', 'uploads/files', 'uploads/voice'];
uploadDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const corsOptions = {
  origin: [
    process.env.FRONTEND_URL, 
    'https://chat-app-kappa-rose.vercel.app', // Current production URL
    'https://social-networking-mu.vercel.app', // Previous production URL (optional)
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://192.168.23.126:3000'
  ].filter(Boolean),
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
const server = http.createServer(app);
const io = new Server(server, { 
  cors: corsOptions,
  transports: ['polling', 'websocket'],
  pingTimeout: 60000,
  pingInterval: 25000
});
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', cors(corsOptions), express.static('uploads'));

// Make prisma and io available to routes
app.use((req, res, next) => {
  req.prisma = prisma;
  req.io = io;
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/turn', turnRoutes);

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
