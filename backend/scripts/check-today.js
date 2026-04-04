
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

    const res = await client.query(`
      SELECT n.id, n.title, n.content, n."senderId", n."createdAt", u.name as "recipientName", u.avatar as "recipientAvatar"
      FROM "Notification" n
      JOIN "User" u ON n."recipientId" = u.id
      WHERE n."createdAt" >= CURRENT_DATE
      ORDER BY n."createdAt" DESC
    `);

    console.log('--- Today Notifications ---');
    for (const row of res.rows) {
      let senderName = 'System';
      let hasSenderProfile = false;
      
      if (row.senderId) {
        const sRes = await client.query('SELECT name, avatar FROM "User" WHERE id = $1', [row.senderId]);
        if (sRes.rows.length > 0) {
          senderName = sRes.rows[0].name;
          hasSenderProfile = !!sRes.rows[0].avatar;
        } else {
          senderName = 'Missing User';
          hasSenderProfile = false;
        }
      }

      console.log(`ID: ${row.id}`);
      console.log(`Recipient: ${row.recipientName}`);
      console.log(`Title: ${row.title}`);
      console.log(`Content: ${row.content}`);
      console.log(`Sender: ${senderName}`);
      console.log(`SenderHasProfile: ${hasSenderProfile}`);
      console.log(`CreatedAt: ${row.createdAt}`);
      console.log('-----------------------------------');
    }

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

main();
