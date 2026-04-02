const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const user = await prisma.user.findFirst({
    orderBy: { createdAt: 'desc' }
  });
  console.log(JSON.stringify(user, null, 2));
}

check()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
