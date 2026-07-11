require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const isSQLite = process.env.DATABASE_URL?.startsWith('file:');

if (!process.env.DATABASE_URL) {
  console.error('[DB ERROR] DATABASE_URL is not set!');
  module.exports = null;
} else if (isSQLite) {
  console.log('[DB INFO] Using SQLite for local development');
  
  const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
  
  const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL });

  const prisma = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

  // With driver adapters, connection is managed by the adapter itself
  prisma.$queryRaw`SELECT 1 AS alive`
    .then(() => console.log('[DB] SQLite connection successful'))
    .catch((err) => console.error('[DB] SQLite connection failed:', err.message));

  module.exports = prisma;
} else {
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
    
    // Remove conflicting SSL params from the URL so our Pool ssl config takes precedence
    params.delete('sslmode');
    params.delete('sslaccept');
    params.delete('sslcert');
    params.delete('sslkey');
    params.delete('sslrootcert');
    
    // Do NOT add sslmode=require, because pg-connection-string forces string validation, 
    // overriding our pool's rejectUnauthorized: false.
    
    const queryString = params.toString();
    return queryString ? `${cleanUrl}?${queryString}` : cleanUrl;
  };

  if (process.env.DATABASE_URL) {
    process.env.DATABASE_URL = patchUrl(process.env.DATABASE_URL);
  }
  if (process.env.DIRECT_URL) {
    process.env.DIRECT_URL = patchUrl(process.env.DIRECT_URL);
  }

  // Now read the connection string after patching
  let connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

  // Decode URL-encoded characters in the connection string
  if (connectionString) {
    try {
      // Parse and reconstruct to ensure proper URL encoding
      const url = new URL(connectionString);
      connectionString = url.toString();
      console.log('[DB INFO] Connection string validated and normalized.');
    } catch (e) {
      console.warn('[DB WARN] Could not validate URL format:', e.message);
    }
  }

  if (!connectionString) {
    console.error('[DB ERROR] Neither DIRECT_URL nor DATABASE_URL is set! Cannot connect to database.');
    console.log('[DB INFO] Please set DATABASE_URL environment variable.');
    // Return null so server can start but database operations will fail gracefully
    module.exports = null;
  } else {
    console.log('[DB OVERRIDE] Applied SSL configuration to database connection string.');
    console.log('[DB INFO] Connection string (first 50 chars):', connectionString.substring(0, 50) + '...');
    
    try {
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

      // With driver adapters, connection is managed by the adapter itself
      // Test connection on module load (async, don't block startup)
      prisma.$queryRaw`SELECT 1 AS alive`
        .then(() => console.log('[DB] Connection test successful'))
        .catch((err) => console.error('[DB] Initial connection test failed:', err.message));

      module.exports = prisma;
    } catch (err) {
      console.error('[DB ERROR] Failed to initialize Prisma client:', err.message);
      // Return null instead of crashing to allow health checks
      module.exports = null;
    }
  }
}