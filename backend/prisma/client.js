require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

// ---------------------------------------------------------------------------------
// FIX FOR RENDER/SUPABASE SSL: 
// Forcefully override connection strings to bypass strict SSL certificate chain checks.
// This handles both Node (pg pool) and Prisma Rust Engine.
// ---------------------------------------------------------------------------------
const patchUrl = (url) => {
  if (!url) return url;
  
  const cleanUrl = url.split('?')[0];
  const params = new URLSearchParams(url.split('?')[1] || '');
  
  params.delete('sslmode');
  params.delete('sslaccept');
  params.delete('sslcert');
  params.delete('sslkey');
  params.delete('sslrootcert');
  
  if (!params.has('sslmode')) {
    params.set('sslmode', 'require');
  }
  
  return `${cleanUrl}?${params.toString()}`;
};

if (process.env.DATABASE_URL) {
  process.env.DATABASE_URL = patchUrl(process.env.DATABASE_URL);
}
if (process.env.DIRECT_URL) {
  process.env.DIRECT_URL = patchUrl(process.env.DIRECT_URL);
}

// Now read the connection string after patching
const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error('[DB ERROR] Neither DIRECT_URL nor DATABASE_URL is set! Cannot connect to database.');
  console.log('[DB INFO] The server will fail on startup. Please set DATABASE_URL environment variable.');
} else {
  console.log('[DB OVERRIDE] Applied SSL configuration to database connection string.');
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
