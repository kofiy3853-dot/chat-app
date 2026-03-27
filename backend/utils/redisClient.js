const redis = require('redis');

let client = null;

const connectRedis = async () => {
  try {
    if (!process.env.REDIS_URL) {
      console.log('Redis URL not configured, skipping Redis connection');
      return null;
    }

    client = redis.createClient({
      url: process.env.REDIS_URL
    });

    client.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });

    client.on('connect', () => {
      console.log('Redis Client Connected');
    });

    await client.connect();
    return client;
  } catch (error) {
    console.error('Redis connection failed:', error.message);
    return null;
  }
};

const getRedisClient = () => {
  return client;
};

// Cache helper functions
const cacheSet = async (key, value, expireSeconds = 3600) => {
  if (!client) return;
  try {
    await client.setEx(key, expireSeconds, JSON.stringify(value));
  } catch (error) {
    console.error('Redis cache set error:', error);
  }
};

const cacheGet = async (key) => {
  if (!client) return null;
  try {
    const value = await client.get(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    console.error('Redis cache get error:', error);
    return null;
  }
};

const cacheDelete = async (key) => {
  if (!client) return;
  try {
    await client.del(key);
  } catch (error) {
    console.error('Redis cache delete error:', error);
  }
};

module.exports = {
  connectRedis,
  getRedisClient,
  cacheSet,
  cacheGet,
  cacheDelete
};
