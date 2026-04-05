#!/usr/bin/env node
/**
 * Comprehensive Diagnostic Script
 * Checks all critical systems and provides actionable fixes
 */

require('dotenv').config();
const prisma = require('../prisma/client');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(level, message) {
  const timestamp = new Date().toISOString();
  const prefix = {
    '✓': `${colors.green}✓${colors.reset}`,
    '✗': `${colors.red}✗${colors.reset}`,
    '⚠': `${colors.yellow}⚠${colors.reset}`,
    'ℹ': `${colors.cyan}ℹ${colors.reset}`
  }[level] || level;
  
  console.log(`[${timestamp}] ${prefix} ${message}`);
}

async function diagnose() {
  console.log(`\n${colors.blue}═══════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.blue}  CAMPUS CHAT - SYSTEM DIAGNOSTIC${colors.reset}`);
  console.log(`${colors.blue}═══════════════════════════════════════════════════════${colors.reset}\n`);

  let issues = [];

  // 1. Environment Variables
  console.log(`${colors.cyan}1. ENVIRONMENT VARIABLES${colors.reset}`);
  const envChecks = {
    'JWT_SECRET': process.env.JWT_SECRET ? '✓' : '✗',
    'DATABASE_URL': process.env.DATABASE_URL ? '✓' : '✗',
    'DIRECT_URL': process.env.DIRECT_URL ? '✓' : '✗',
    'SUPABASE_URL': process.env.SUPABASE_URL ? '✓' : '✗',
    'SUPABASE_SERVICE_ROLE_KEY': process.env.SUPABASE_SERVICE_ROLE_KEY ? '✓' : '✗',
    'ONESIGNAL_APP_ID': process.env.ONESIGNAL_APP_ID ? '✓' : '✗',
    'ONESIGNAL_REST_API_KEY': process.env.ONESIGNAL_REST_API_KEY ? '✓' : '✗'
  };

  Object.entries(envChecks).forEach(([key, status]) => {
    if (status === '✓') {
      log('✓', `${key} is set`);
    } else {
      log('✗', `${key} is MISSING`);
      issues.push(`Missing environment variable: ${key}`);
    }
  });

  // 2. Database Connection
  console.log(`\n${colors.cyan}2. DATABASE CONNECTION${colors.reset}`);
  try {
    await prisma.$queryRaw`SELECT 1 AS alive`;
    log('✓', 'Database connection successful');
  } catch (err) {
    log('✗', `Database connection failed: ${err.message}`);
    issues.push(`Database connection error: ${err.message}`);
  }

  // 3. Database Schema
  console.log(`\n${colors.cyan}3. DATABASE SCHEMA${colors.reset}`);
  try {
    const tables = await prisma.$queryRaw`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `;
    
    const tableNames = tables.map(t => t.table_name);
    const requiredTables = ['User', 'Conversation', 'Message', 'ConversationParticipant'];
    
    requiredTables.forEach(table => {
      if (tableNames.includes(table)) {
        log('✓', `Table "${table}" exists`);
      } else {
        log('✗', `Table "${table}" is MISSING`);
        issues.push(`Missing database table: ${table}`);
      }
    });

    // Check User table columns
    console.log(`\n  Checking User table columns...`);
    const userColumns = await prisma.$queryRaw`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'User' AND table_schema = 'public'
      ORDER BY column_name;
    `;
    
    const columnNames = userColumns.map(c => c.column_name);
    const requiredColumns = ['id', 'email', 'password', 'name', 'role', 'createdAt'];
    
    requiredColumns.forEach(col => {
      if (columnNames.includes(col)) {
        log('✓', `  Column "User.${col}" exists`);
      } else {
        log('✗', `  Column "User.${col}" is MISSING`);
        issues.push(`Missing User column: ${col}`);
      }
    });

  } catch (err) {
    log('✗', `Schema check failed: ${err.message}`);
    issues.push(`Schema check error: ${err.message}`);
  }

  // 4. Sample Data
  console.log(`\n${colors.cyan}4. SAMPLE DATA${colors.reset}`);
  try {
    const userCount = await prisma.user.count();
    log('ℹ', `Total users in database: ${userCount}`);
    
    if (userCount === 0) {
      log('⚠', 'No users found. You need to register at least one user.');
    }
  } catch (err) {
    log('✗', `Could not count users: ${err.message}`);
  }

  // 5. Authentication Test
  console.log(`\n${colors.cyan}5. AUTHENTICATION TEST${colors.reset}`);
  try {
    const jwt = require('jsonwebtoken');
    const testToken = jwt.sign({ userId: 'test', role: 'STUDENT' }, process.env.JWT_SECRET, { expiresIn: '1h' });
    const decoded = jwt.verify(testToken, process.env.JWT_SECRET);
    log('✓', 'JWT signing and verification working');
  } catch (err) {
    log('✗', `JWT test failed: ${err.message}`);
    issues.push(`JWT error: ${err.message}`);
  }

  // 6. Summary
  console.log(`\n${colors.blue}═══════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.blue}  SUMMARY${colors.reset}`);
  console.log(`${colors.blue}═══════════════════════════════════════════════════════${colors.reset}\n`);

  if (issues.length === 0) {
    log('✓', `${colors.green}All systems operational!${colors.reset}`);
  } else {
    log('✗', `${colors.red}Found ${issues.length} issue(s):${colors.reset}`);
    issues.forEach((issue, i) => {
      console.log(`  ${i + 1}. ${issue}`);
    });
    
    console.log(`\n${colors.yellow}RECOMMENDED ACTIONS:${colors.reset}`);
    console.log('  1. Verify all environment variables are set correctly');
    console.log('  2. Run: npm run db:init');
    console.log('  3. Check backend logs for detailed error messages');
    console.log('  4. Ensure database credentials are correct');
  }

  console.log(`\n${colors.blue}═══════════════════════════════════════════════════════${colors.reset}\n`);

  await prisma.$disconnect();
  process.exit(issues.length > 0 ? 1 : 0);
}

diagnose().catch(err => {
  console.error('Diagnostic failed:', err);
  process.exit(1);
});
