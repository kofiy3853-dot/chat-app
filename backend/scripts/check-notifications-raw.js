
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

    const res = await client.query('SELECT * FROM "Notification" ORDER BY "createdAt" DESC LIMIT 10');
    console.log('--- Recent Notifications ---');
    
    for (const notif of res.rows) {
      let senderName = 'System';
      let hasProfile = false;
      
      if (notif.senderId) {
        const senderRes = await client.query('SELECT name, avatar FROM "User" WHERE id = $1', [notif.senderId]);
        if (senderRes.rows.length > 0) {
          const sender = senderRes.rows[0];
          senderName = sender.name;
          hasProfile = !!sender.avatar;
        } else {
          senderName = 'Missing User';
          hasProfile = false;
        }
      }

      console.log(`ID: ${notif.id}`);
      console.log(`Title: ${notif.title}`);
      console.log(`Content: ${notif.content}`);
      console.log(`Sender: ${senderName}`);
      console.log(`HasProfile: ${hasProfile}`);
      console.log(`CreatedAt: ${notif.createdAt}`);
      console.log('-----------------------------------');
    }
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

main();
