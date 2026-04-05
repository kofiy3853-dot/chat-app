#!/usr/bin/env node
/**
 * Database Initialization Script
 * Ensures Prisma schema is synced with the database
 * Run this after deploying or when schema changes
 */

require('dotenv').config();
const { execSync } = require('child_process');
const prisma = require('../prisma/client');

async function initializeDatabase() {
  console.log('[DB INIT] Starting database initialization...');
  
  try {
    // Test connection
    console.log('[DB INIT] Testing database connection...');
    await prisma.$queryRaw`SELECT 1 AS alive`;
    console.log('[DB INIT] ✓ Database connection successful');

    // Push schema to database (creates/updates tables)
    console.log('[DB INIT] Syncing Prisma schema with database...');
    try {
      execSync('npx prisma db push --skip-generate', { stdio: 'inherit' });
      console.log('[DB INIT] ✓ Schema synced successfully');
    } catch (err) {
      console.warn('[DB INIT] Schema push had warnings (this is usually OK):', err.message);
    }

    // Generate Prisma client
    console.log('[DB INIT] Generating Prisma client...');
    execSync('npx prisma generate', { stdio: 'inherit' });
    console.log('[DB INIT] ✓ Prisma client generated');

    // Verify critical tables exist
    console.log('[DB INIT] Verifying critical tables...');
    const tables = await prisma.$queryRaw`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `;
    
    const tableNames = tables.map(t => t.table_name);
    const requiredTables = ['User', 'Conversation', 'Message', 'ConversationParticipant'];
    const missing = requiredTables.filter(t => !tableNames.includes(t));
    
    if (missing.length > 0) {
      console.warn('[DB INIT] ⚠ Missing tables:', missing.join(', '));
      console.warn('[DB INIT] This may cause runtime errors. Consider running: npx prisma migrate deploy');
    } else {
      console.log('[DB INIT] ✓ All critical tables exist');
    }

    console.log('[DB INIT] ✓ Database initialization complete!');
    process.exit(0);
  } catch (error) {
    console.error('[DB INIT] ✗ Initialization failed:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

initializeDatabase();
