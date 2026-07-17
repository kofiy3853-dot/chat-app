require('dotenv').config({ path: require('path').join(__dirname, '.env') });


const express = require('express');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const { redisClient, connectRedis } = require('./utils/redis');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

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
const { authMiddleware, requireRole } = require('./middleware/authMiddleware');

const app = express();


// Warn if NODE_ENV is not set in production
if (!process.env.NODE_ENV) {
  console.warn('[SECURITY] NODE_ENV is not set. CORS restrictions may not apply. Set NODE_ENV=production for deployed environments.');
}

// Allowed origin patterns — only explicit origins from env, no hardcoded URLs
const ALLOWED_ORIGINS = [
  process.env.FRONTEND_URL,
  process.env.ADDITIONAL_ORIGIN,
  process.env.NODE_ENV !== 'production' && 'http://localhost:3000',
  process.env.NODE_ENV !== 'production' && 'http://127.0.0.1:3000',
].filter(Boolean);

if (ALLOWED_ORIGINS.length === 0) {
  console.warn('[SECURITY] No FRONTEND_URL configured. CORS will block all cross-origin requests.');
}

// Global rate limiter: 100 requests per minute per IP
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later.' }
});

// Stricter limiter for auth endpoints: 10 requests per minute per IP
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many authentication attempts, please try again later.' }
});

// Request logging with response time tracking
app.use((req, res, next) => {
  const start = Date.now();
  const originalEnd = res.end;
  res.end = function (...args) {
    const duration = Date.now() - start;
    const status = res.statusCode;
    const level = status >= 500 ? 'ERROR' : status >= 400 ? 'WARN' : duration > 1000 ? 'SLOW' : 'INFO';
    console.log(`[${level}] ${req.method} ${req.path} ${status} ${duration}ms`);
    originalEnd.apply(this, args);
  };
  next();
});

// Streamlined CORS Middleware — only explicit origins, no environment bypass
const corsOptions = {
  origin: (origin, callback) => {
    // Permit requests with no origin (server-to-server, health checks)
    if (!origin) return callback(null, true);

    if (ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
};

app.use(helmet());
app.use(globalLimiter);
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

// Detailed diagnostic health check — admin-only, exposes env var presence and live DB connectivity
app.get('/health/detailed', authMiddleware, requireRole('ADMIN'), async (req, res) => {
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
    checks.database.error = process.env.NODE_ENV === 'production' ? 'Connection failed' : err.message;
    console.error('[DIAGNOSTIC FAILED]', err);
  }

  const allGood = checks.database.status === 'connected';

  res.status(allGood ? 200 : 500).json(checks);
});

// Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/turn', turnRoutes);
app.use('/api/notifications', pushRoutes);
app.use('/api/status', statusRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/anonymous', anonymousRoutes);

// Socket.IO setup
setupSockets(io);

// Catch-all API 404s
app.use((req, res, next) => {
  if (req.originalUrl.startsWith('/api')) {
    return res.status(404).json({ message: 'API route not found' });
  }
  next();
});

// Error handling middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Test database connection
const { initializeNana } = require('./utils/nanaInitializer');
const { startNotificationCleanup } = require('./utils/cleanupNotifications');

async function startServer() {
  try {
    // Test Prisma connection (if configured)
    if (prisma && typeof prisma.$queryRaw === 'function') {
      await prisma.$queryRaw`SELECT 1 AS alive`;
      console.log('✓ Connected to database');
      
      // Proactively initialize system accounts
      await initializeNana();

      // Start periodic notification cleanup (old notifications > 30 days)
      startNotificationCleanup();
      
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
