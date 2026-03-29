const { PrismaClient } = require('./prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const users = await prisma.user.findMany({
      where: { avatar: { not: null } },
      select: { avatar: true, name: true }
    });
    console.log('--- USER AVATARS ---');
    console.log(JSON.stringify(users, null, 2));

    const messages = await prisma.message.findMany({
      where: { fileUrl: { not: null } },
      select: { fileUrl: true, fileName: true, type: true }
    });
    console.log('\n--- MESSAGE ATTACHMENTS ---');
    console.log(JSON.stringify(messages, null, 2));

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

check();
