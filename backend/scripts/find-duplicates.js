
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

    // Find duplicates for any user
    const res = await client.query(`
      SELECT "recipientId", "title", "content", count(*)
      FROM "Notification"
      GROUP BY "recipientId", "title", "content"
      HAVING count(*) > 1
    `);

    console.log('--- Duplicate Notifications Found ---');
    for (const row of res.rows) {
      console.log(`Recipient: ${row.recipientId}`);
      console.log(`Title: ${row.title}`);
      console.log(`Content: ${row.content}`);
      console.log(`Count: ${row.count}`);
      
      // Fetch details of these duplicates
      const details = await client.query(
        'SELECT id, "senderId", "createdAt" FROM "Notification" WHERE "recipientId" = $1 AND "title" = $2 AND "content" = $3 ORDER BY "createdAt" DESC',
        [row.recipientId, row.title, row.content]
      );
      
      for (const d of details.rows) {
        let senderName = 'System';
        if (d.senderId) {
          const s = await client.query('SELECT name FROM "User" WHERE id = $1', [d.senderId]);
          senderName = s.rows.length > 0 ? s.rows[0].name : 'Missing User';
        }
        console.log(`  - ID: ${d.id}, Sender: ${senderName}, CreatedAt: ${d.createdAt}`);
      }
      console.log('-----------------------------------');
    }

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

main();
