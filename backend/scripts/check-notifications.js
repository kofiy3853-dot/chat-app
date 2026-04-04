
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load .env BEFORE requiring Prisma
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envConfig = dotenv.parse(fs.readFileSync(envPath));
  for (const k in envConfig) {
    process.env[k] = envConfig[k];
  }
}

const { PrismaClient } = require('@prisma/client');
console.log('Using DATABASE_URL:', process.env.DATABASE_URL ? 'PRESENT' : 'MISSING');

// In Prisma 5/6/7, you should be able to pass datasourceUrl or use env vars
const prisma = new PrismaClient();

async function main() {
  console.log('--- Fetching Recent Notifications ---');
  // Try a simple count first to see if it works
  const count = await prisma.notification.count();
  console.log(`Total notifications in DB: ${count}`);

  const notifications = await prisma.notification.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: {
      recipient: { select: { id: true, name: true, email: true } },
    }
  });

  for (const notif of notifications) {
    let senderName = 'Unknown/System';
    let hasProfile = false;
    let senderAvatar = null;
    
    if (notif.senderId) {
      const sender = await prisma.user.findUnique({ 
        where: { id: notif.senderId },
        select: { name: true, avatar: true }
      });
      if (sender) {
        senderName = sender.name;
        senderAvatar = sender.avatar;
        hasProfile = !!sender.avatar; 
      } else {
        senderName = 'Missing User Profile';
        hasProfile = false;
      }
    } else {
      senderName = 'System/Deleted';
      hasProfile = false;
    }

    console.log(`ID: ${notif.id}`);
    console.log(`Type: ${notif.type}`);
    console.log(`Title: ${notif.title}`);
    console.log(`Content: ${notif.content}`);
    console.log(`Sender: ${senderName}`);
    console.log(`HasProfile: ${hasProfile}`);
    console.log(`Recipient: ${notif.recipient.name}`);
    console.log(`Created At: ${notif.createdAt}`);
    console.log('-----------------------------------');
  }
}

main()
  .catch(e => {
    console.error('Error in main:');
    console.error(e);
  })
  .finally(async () => await prisma.$disconnect());
