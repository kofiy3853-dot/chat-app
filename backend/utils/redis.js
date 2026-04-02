const { createClient } = require('redis');

const REDIS_URL = process.env.REDIS_URL;
let redisClient = null;
let _warnedOnce = false;

if (REDIS_URL) {
  redisClient = createClient({
    url: REDIS_URL,
    socket: {
      connectTimeout: 5000,
      reconnectStrategy: (retries) => {
        if (retries >= 1) {
          // After first failure, stop trying
          return false;
        }
        return 500;
      }
    }
  });

  // Suppress all error events - we handle them in connectRedis
  redisClient.on('error', () => {
    if (!_warnedOnce) {
      _warnedOnce = true;
      console.warn('[Redis] Connection unavailable — push scaling disabled. App continues normally.');
    }
  });

  redisClient.on('connect', () => console.log('[Redis] Client connected'));
  redisClient.on('ready', () => console.log('[Redis] Client ready'));
}

const connectRedis = async () => {
  if (!redisClient) return;

  try {
    await redisClient.connect();
  } catch (err) {
    // Reset client to null so server.js won't try to use it
    redisClient = null;
  }
};

module.exports = {
  get redisClient() { return redisClient; },
  connectRedis
};
