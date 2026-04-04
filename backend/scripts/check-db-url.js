const prisma = require('../prisma/client');

async function main() {
  const msgs = await prisma.message.findMany({
    where: {
      fileUrl: {
        contains: 'ruxfsk'
      }
    }
  });
  console.log(JSON.stringify(msgs, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
