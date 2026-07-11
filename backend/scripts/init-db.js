#!/usr/bin/env node
/**
 * Database Initialization Script
 * Ensures Prisma schema is synced with the database
 * Run this after deploying or when schema changes
 */

require('dotenv').config();
const { execSync } = require('child_process');

async function initializeDatabase() {
  console.log('[DB INIT] Starting database initialization...');
  
  try {
    // Push schema to database (creates/updates tables)
    console.log('[DB INIT] Syncing Prisma schema with database...');
    execSync('npx prisma db push', { stdio: 'inherit' });
    console.log('[DB INIT] ✓ Schema synced successfully');

    // Generate Prisma client
    console.log('[DB INIT] Generating Prisma client...');
    execSync('npx prisma generate', { stdio: 'inherit' });
    console.log('[DB INIT] ✓ Prisma client generated');

    console.log('[DB INIT] ✓ Database initialization complete!');
    process.exit(0);
  } catch (error) {
    console.error('[DB INIT] ✗ Initialization failed:', error.message);
    process.exit(1);
  }
}

initializeDatabase();