#!/usr/bin/env node

/**
 * Verification Script - Check if Campus Chat is properly configured
 * Run: node scripts/verify-setup.js
 */

const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function check(condition, successMsg, failMsg) {
  if (condition) {
    log(`✓ ${successMsg}`, 'green');
    return true;
  } else {
    log(`✗ ${failMsg}`, 'red');
    return false;
  }
}

async function verify() {
  log('\n🔍 Campus Chat Setup Verification\n', 'cyan');

  let allGood = true;

  // 1. Check .env file
  log('1. Environment Configuration', 'blue');
  const envPath = path.join(__dirname, '..', '.env');
  const envExists = fs.existsSync(envPath);
  allGood &= check(envExists, '.env file exists', '.env file not found');

  if (envExists) {
    const env = require('dotenv').config({ path: envPath }).parsed || {};
    
    allGood &= check(env.DATABASE_URL, 'DATABASE_URL is set', 'DATABASE_URL is missing');
    allGood &= check(env.DIRECT_URL, 'DIRECT_URL is set', 'DIRECT_URL is missing');
    allGood &= check(env.JWT_SECRET, 'JWT_SECRET is set', 'JWT_SECRET is missing');
    allGood &= check(env.SUPABASE_URL, 'SUPABASE_URL is set', 'SUPABASE_URL is missing');
    allGood &= check(env.SUPABASE_SERVICE_ROLE_KEY, 'SUPABASE_SERVICE_ROLE_KEY is set', 'SUPABASE_SERVICE_ROLE_KEY is missing');
  }

  // 2. Check Node modules
  log('\n2. Dependencies', 'blue');
  const nodeModulesPath = path.join(__dirname, '..', 'node_modules');
  allGood &= check(fs.existsSync(nodeModulesPath), 'node_modules exists', 'node_modules not found - run npm install');

  // 3. Check Prisma
  log('\n3. Database Setup', 'blue');
  const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');
  allGood &= check(fs.existsSync(schemaPath), 'Prisma schema exists', 'Prisma schema not found');

  // 4. Check database connection
  log('\n4. Database Connection', 'blue');
  try {
    const prisma = require('../prisma/client');
    await prisma.$connect();
    log('✓ Database connection successful', 'green');
    await prisma.$disconnect();
  } catch (error) {
    log(`✗ Database connection failed: ${error.message}`, 'red');
    allGood = false;
  }

  // 5. Check required files
  log('\n5. Required Files', 'blue');
  const requiredFiles = [
    'server.js',
    'routes/authRoutes.js',
    'controllers/authController.js',
    'middleware/authMiddleware.js',
    'utils/supabaseClient.js'
  ];

  requiredFiles.forEach(file => {
    const filePath = path.join(__dirname, '..', file);
    allGood &= check(fs.existsSync(filePath), `${file} exists`, `${file} not found`);
  });

  // 6. Summary
  log('\n' + '='.repeat(50), 'cyan');
  if (allGood) {
    log('✓ All checks passed! You\'re ready to go.', 'green');
    log('\nNext steps:', 'cyan');
    log('1. npm run dev          # Start the server', 'yellow');
    log('2. Test login at http://localhost:3000/login', 'yellow');
  } else {
    log('✗ Some checks failed. Please fix the issues above.', 'red');
    log('\nCommon fixes:', 'cyan');
    log('1. npm install          # Install dependencies', 'yellow');
    log('2. npm run db:push      # Sync database schema', 'yellow');
    log('3. Check .env file      # Verify all variables', 'yellow');
  }
  log('='.repeat(50) + '\n', 'cyan');

  process.exit(allGood ? 0 : 1);
}

verify().catch(error => {
  log(`\n✗ Verification failed: ${error.message}`, 'red');
  process.exit(1);
});
