const prisma = require('./prisma/client');
async function run() {
  try {
    const nana = await prisma.user.findFirst({ where: { role: 'NANA' } });
    const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    console.log('--- DB DATA ---');
    console.log('NANA:', JSON.stringify(nana, null, 2));
    console.log('ADMIN:', JSON.stringify(admin, null, 2));
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}
run();
