const { createClient } = require('redis');

const REDIS_URL = process.env.REDIS_URL;
let redisClient = null;

if (REDIS_URL) {
  redisClient = createClient({
    url: REDIS_URL,
    socket: {
      reconnectStrategy: (retries) => {
        if (retries > 5) {
          console.warn('Redis: Max retries reached. Giving up.');
          return false; // Stop reconnecting
        }
        return Math.min(retries * 500, 2000);
      }
    }
  });

  redisClient.on('error', (err) => {
    if (redisClient?.isOpen) {
      console.error('Redis Client Error:', err.message);
    }
  });
  redisClient.on('connect', () => console.log('Redis: Client connected'));
  redisClient.on('ready', () => console.log('Redis: Client ready'));
}

const connectRedis = async () => {
  if (redisClient && !redisClient.isOpen) {
    try {
      await redisClient.connect();
    } catch (err) {
      // Log only once if connection fails
      console.warn('Redis: Failed to connect on startup. Scaling disabled.');
    }
  }
};

module.exports = {
  redisClient,
  connectRedis
};
