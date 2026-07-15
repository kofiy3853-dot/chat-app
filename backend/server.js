require('dotenv').config({ path: require('path').join(__dirname, '.env') });


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

// REQUIREMENT 6: Test notification on startup
const { sendPushNotification } = require('./utils/firebasePush');
setTimeout(() => {
  console.log('[FIREBASE] Running startup push test readiness check...');
  // Note: We don't have a specific device token here, so we just log the readiness.
  // In a real test, you'd provide a verified test token in ENV.
  if (process.env.TEST_FCM_TOKEN) {
    sendPushNotification(process.env.TEST_FCM_TOKEN, {
      title: 'Server Test',
      message: 'FCM Backend is now online and verified.'
    });
  }
}, 5000);
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
  'https://chat-pkn4qz1mq-kofiy3853-dots-projects.vercel.app', // Added current Vercel deployment
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://192.168.23.126:3000',
].filter(Boolean);

// Request logging
app.use((req, res, next) => {
  console.log(`[REQUEST] ${req.method} ${req.path} | Origin: ${req.headers.origin || 'none'}`);
  next();
});

// Streamlined CORS Middleware
const corsOptions = {
  origin: (origin, callback) => {
    // Permit requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    
    if (ALLOWED_ORIGINS.includes(origin) || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      console.warn(`[CORS BLOCKED] ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
};

app.use(cors(corsOptions));

const server = http.createServer(app);
const io = new Server(server, { 
  cors: corsOptions,
  transports: ['websocket', 'polling'], 
  pingTimeout: 60000, 
  pingInterval: 25000,
  connectTimeout: 45000,
  allowEIO3: true // Support older clients if needed
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
    await prisma.$queryRaw`SELECT 1 AS alive`;
    checks.database.status = 'connected';

    // 2. Count messages
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
const { initializeNana } = require('./utils/nanaInitializer');

async function startServer() {
  try {
    // Test Prisma connection (if configured)
    if (prisma && typeof prisma.$queryRaw === 'function') {
      await prisma.$queryRaw`SELECT 1 AS alive`;
      console.log('✓ Connected to database');
      
      // Proactively initialize system accounts
      await initializeNana();
      
      // Verify critical tables exist (non-blocking)
      try {
        const count = await prisma.message.count();
        console.log(`✓ Database connected (${count} messages)`);
      } catch (tableErr) {
        console.warn('⚠ Could not verify tables:', tableErr.message);
      }
    } else {
      console.warn('⚠ Database not configured. Server will start for health checks only.');
    }
    
    server.listen(PORT, () => {
      console.log(`✓ Server running on port ${PORT}`);
      console.log(`✓ Health check: http://localhost:${PORT}/health`);
      console.log(`✓ Detailed health: http://localhost:${PORT}/health/detailed`);
    });
  } catch (err) {
    console.error('✗ Database connection error:', err.message);
    console.warn('⚠ Starting server anyway for health checks.');
    
    server.listen(PORT, () => {
      console.log(`✓ Server running on port ${PORT} (database unavailable)`);
      console.log(`✓ Health check: http://localhost:${PORT}/health`);
    });
  }
}

startServer();

module.exports = { io };
