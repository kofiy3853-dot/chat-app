require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

// Parse the connection string safely, supporting both encoded and raw passwords
let connectionString = process.env.DATABASE_URL;

// In Prisma 7, stripping query parameters might cause issues with pgbouncer modes
// if (connectionString) {
//   connectionString = connectionString.split('?')[0];
// }

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

module.exports = prisma;
