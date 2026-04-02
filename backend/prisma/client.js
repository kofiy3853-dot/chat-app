require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

// IMPORTANT: DATABASE_URL uses pgbouncer (port 6543) which is for Prisma Migrate only.
// The pg.Pool needs a DIRECT connection (port 5432) to work correctly at runtime.
// Use DIRECT_URL if available, otherwise fall back to DATABASE_URL.
const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error('[DB ERROR] Neither DIRECT_URL nor DATABASE_URL is set! Cannot connect to database.');
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
  console.error('[PG POOL ERROR]', err.message);
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

module.exports = prisma;
