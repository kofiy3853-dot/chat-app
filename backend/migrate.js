require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function run() {
  let connectionString = process.env.DIRECT_URL;
  if (!connectionString) {
    throw new Error('DIRECT_URL is not set');
  }

  // Strip query parameters so pg's ssl config isn't overridden by sslmode=require
  connectionString = connectionString.split('?')[0];

  console.log('Connecting to database via Node pg driver to run migrations...');
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected.');
    
    // Clear out any partially created types/tables from previous failed run
    console.log('Dropping existing public schema to start fresh...');
    await client.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');

    const sqlPath = path.join(__dirname, 'init.sql');
    const sql = fs.readFileSync(sqlPath, 'utf16le');
    
    console.log('Executing Prisma schema SQL...');
    
    // Split by semicolon and run each statement to prevent PgBouncer pooler protocol errors
    const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0);
    
    for (const statement of statements) {
      await client.query(statement + ';');
    }
    
    console.log('Schema successfully pushed!');
    
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await client.end();
  }
}

run();
