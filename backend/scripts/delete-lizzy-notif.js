
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envConfig = dotenv.parse(fs.readFileSync(envPath));
  for (const k in envConfig) {
    process.env[k] = envConfig[k];
  }
}

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    console.log('Connected to database');

    const idToDelete = '139ad898-dada-40d7-9c19-5744add36d9f';
    const res = await client.query('DELETE FROM "Notification" WHERE id = $1', [idToDelete]);
    console.log(`Deleted notification ${idToDelete}: ${res.rowCount} row(s)`);

    // Check alerts as requested
    console.log('--- Today Alerts ---');
    const alertsRes = await client.query(`
      SELECT n.id, n.title, n.content, n."createdAt", u.name as "recipient"
      FROM "Notification" n
      JOIN "User" u ON n."recipientId" = u.id
      WHERE n."createdAt" >= CURRENT_DATE AND (n.type = 'SYSTEM' OR n.title ILIKE '%alert%')
      ORDER BY n."createdAt" DESC
    `);
    
    for (const a of alertsRes.rows) {
      console.log(`[ALERT] Recipient: ${a.recipient}, Title: ${a.title}, CreatedAt: ${a.createdAt}`);
    }

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

main();
