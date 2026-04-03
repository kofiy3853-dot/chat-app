const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { role: 'NANA' },
        { name: { contains: 'Nana', mode: 'insensitive' } }
      ]
    },
    select: { id: true, name: true, role: true }
  });
  console.log(JSON.stringify(users, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
