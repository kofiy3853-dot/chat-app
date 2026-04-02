const prisma = require('./prisma/client');
async function main() {
  const nana = await prisma.user.findFirst({ where: { name: { contains: 'Nana' } } });
  console.log('Nana User:', JSON.stringify(nana, null, 2));
}
main().finally(() => prisma.$disconnect());
