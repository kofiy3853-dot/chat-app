#!/usr/bin/env node
/**
 * build-for-render.js
 * 
 * This script is run during the Render build process.
 * It patches schema.prisma to use 'postgresql' instead of 'sqlite',
 * then runs `prisma generate` and `prisma db push`.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');

// --- 1. Patch schema.prisma ---
console.log('[BUILD] Reading Prisma schema...');
let schema = fs.readFileSync(schemaPath, 'utf8');

if (schema.includes('provider = "sqlite"')) {
  schema = schema.replace('provider = "sqlite"', 'provider = "postgresql"');
  fs.writeFileSync(schemaPath, schema, 'utf8');
  console.log('[BUILD] ✓ Patched schema.prisma: sqlite → postgresql');
} else if (schema.includes('provider = "postgresql"')) {
  console.log('[BUILD] ✓ Schema already set to postgresql. No change needed.');
} else {
  console.warn('[BUILD] ⚠ Could not find provider declaration in schema.prisma');
}

// --- 2. Run prisma generate ---
console.log('[BUILD] Running prisma generate...');
execSync('npx prisma generate', { stdio: 'inherit' });

// --- 3. Run prisma db push ---
console.log('[BUILD] Running prisma db push...');
execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit' });

console.log('[BUILD] ✓ All done! Database is ready.');
