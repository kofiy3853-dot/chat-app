#!/usr/bin/env node
/**
 * build-for-render.js
 *
 * Generates the Prisma Client for PostgreSQL.
 * The schema is already set to 'postgresql' — no patching needed.
 * 'prisma db push' runs at server startup to avoid build-time network restrictions.
 */

const { execSync } = require('child_process');

console.log('[BUILD] Running prisma generate...');
execSync('npx prisma generate', { stdio: 'inherit' });
console.log('[BUILD] ✓ Prisma Client generated. Tables will be created at server startup.');
