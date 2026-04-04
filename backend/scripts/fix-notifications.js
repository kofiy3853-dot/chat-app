
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

    // Identify notifications with no sender profile that were created recently
    const res = await client.query(`
      SELECT n.id, n.title, n.content, n."senderId", n.type
      FROM "Notification" n
      WHERE n."createdAt" >= CURRENT_DATE
    `);

    let deletedCount = 0;
    for (const row of res.rows) {
      let shouldDelete = false;
      if (!row.senderId) {
        shouldDelete = true;
      } else {
        const sRes = await client.query('SELECT avatar FROM "User" WHERE id = $1', [row.senderId]);
        if (sRes.rows.length === 0 || !sRes.rows[0].avatar) {
          shouldDelete = true;
        }
      }

      if (shouldDelete) {
        // Double check if it's a "System" notification we want to keep or if it's a duplicate
        // The user said "pop out two delete the one with no user profile"
        // This suggests there's another one WITH a profile.
        
        // Find if there's a matching notification with a profile for the same recipient/content
        const dupCheck = await client.query(`
          SELECT n.id FROM "Notification" n
          JOIN "User" u ON n."senderId" = u.id
          WHERE n.content = $1 AND n."recipientId" = (SELECT "recipientId" FROM "Notification" WHERE id = $2)
          AND u.avatar IS NOT NULL
        `, [row.content, row.id]);

        if (dupCheck.rows.length > 0) {
          console.log(`Deleting duplicate notification without profile: ${row.id} (${row.title}: ${row.content})`);
          await client.query('DELETE FROM "Notification" WHERE id = $1', [row.id]);
          deletedCount++;
        }
      }
    }

    console.log(`Deleted ${deletedCount} duplicate notifications without profiles.`);

    // Check alerts
    console.log('--- Current Alerts (Today) ---');
    const alerts = await client.query(`
      SELECT * FROM "Notification" 
      WHERE "createdAt" >= CURRENT_DATE AND (type = 'SYSTEM' OR type = 'ANNOUNCEMENT' OR title ILIKE '%alert%')
      ORDER BY "createdAt" DESC
    `);
    
    for (const a of alerts.rows) {
      console.log(`ID: ${a.id}, Title: ${a.title}, Content: ${a.content}, Type: ${a.type}`);
    }

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

main();
