require('dotenv').config();


// Bypass strict SSL certificate chain checks (Required for Supabase pooler on some Render environments)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const express = require('express');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const { redisClient, connectRedis } = require('./utils/redis');
const cors = require('cors');

// GLOBAL ERROR RECOVERY: Prevent silent crashes on Render
process.on('unhandledRejection', (reason, promise) => {
  console.error('[FATAL] Unhandled Rejection at:', promise, 'reason:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught Exception:', err);
});
const prisma = require('./prisma/client');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const chatRoutes = require('./routes/chatRoutes');
const courseRoutes = require('./routes/courseRoutes');
const { setupSockets } = require('./sockets');
const turnRoutes = require('./routes/turnRoutes');
const pushRoutes = require('./routes/pushRoutes');
const statusRoutes = require('./routes/statusRoutes');
const eventRoutes = require('./routes/eventRoutes');
const announcementRoutes = require('./routes/announcementRoutes');
const anonymousRoutes = require('./routes/anonymousRoutes');

const errorHandler = require('./middleware/errorHandler');

const app = express();


// Allowed origin patterns
const ALLOWED_ORIGINS = [
  process.env.FRONTEND_URL,
  'https://chat-app-kappa-rose.vercel.app',
  'https://social-networking-mu.vercel.app',
  'https://chat-jdfqbgvhk-kofiy3853-dots-projects.vercel.app',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://192.168.23.126:3000',
].filter(Boolean);

// Request logging
app.use((req, res, next) => {
  console.log(`[REQUEST] ${req.method} ${req.path}`);
  next();
});

// Manual CORS Middleware - Foolproof for all environments
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  // Allow all origins with credentials support
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, Access-Control-Allow-Origin');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

const corsOptions = {
  origin: (origin, callback) => callback(null, true),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
};

const server = http.createServer(app);
const io = new Server(server, { 
  cors: corsOptions,
  transports: ['websocket', 'polling'], // 🔥 Priority: websocket first for Render sticky session stability
  pingTimeout: 120000, 
  pingInterval: 30000,
  connectTimeout: 45000
});

// Redis Adapter for Socket.io
(async () => {
  try {
    if (!redisClient) {
      console.log('Redis: Not configured (REDIS_URL missing) — skipping scaling adapter.');
      return;
    }

    await connectRedis();
    if (redisClient.isOpen) {
      const pubClient = redisClient;
      const subClient = pubClient.duplicate();
      await subClient.connect();
      io.adapter(createAdapter(pubClient, subClient));
      console.log('Redis: Socket.io adapter initialized');
    }
  } catch (err) {
    console.error('Redis: Failed to initialize Socket.io adapter:', err.message);
  }
})();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Make prisma and io available to routes
app.use((req, res, next) => {
  req.prisma = prisma;
  req.io = io;
  next();
});

// Basic health check
app.get('/health', (req, res) => res.status(200).json({ status: 'ok', timestamp: new Date(), version: '1.0.5-diagnostics' }));

// Detailed diagnostic health check — exposes env var presence and live DB connectivity
app.get('/health/detailed', async (req, res) => {
  const checks = {
    timestamp: new Date(),
    env: {
      DATABASE_URL: !!process.env.DATABASE_URL,
      DIRECT_URL: !!process.env.DIRECT_URL,
      JWT_SECRET: !!process.env.JWT_SECRET,
      NODE_ENV: process.env.NODE_ENV || 'not set'
    },
    database: { status: 'untested', error: null, schema: {} }
  };

  try {
    // 1. Connectivity test
    await prisma.$queryRawUnsafe('SELECT 1 AS alive');
    checks.database.status = 'connected';

    // 2. Schema existence check
    const columnCheck = await prisma.$queryRawUnsafe(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'Message'
    `);
    checks.database.schema.messageColumns = columnCheck.map(c => c.column_name);
    
    const countCheck = await prisma.message.count().catch(e => -1);
    checks.database.schema.messageCount = countCheck;
  } catch (err) {
    checks.database.status = 'FAILED';
    checks.database.error = err.message;
    console.error('[DIAGNOSTIC FAILED]', err);
  }

  const allGood = checks.database.status === 'connected';

  res.status(allGood ? 200 : 500).json(checks);
});

// Routes
console.log('Registering routes...');
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/turn', turnRoutes);
app.use('/api/notifications', pushRoutes);
app.use('/api/status', statusRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/anonymous', anonymousRoutes);
console.log('All routes registered successfully');

// Socket.IO setup
setupSockets(io);

// Catch-all API 404s
app.use((req, res, next) => {
  if (req.originalUrl.startsWith('/api')) {
    console.log(`[API 404] ${req.method} ${req.originalUrl}`);
    return res.status(404).json({ message: `API route not found: ${req.originalUrl}` });
  }
  next();
});

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
