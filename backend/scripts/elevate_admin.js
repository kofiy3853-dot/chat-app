const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const prisma = require('../prisma/client');

async function main() {
  const email = 'redeemer0420233803d@ktu.edu.gh';
  const user = await prisma.user.update({
    where: { email },
    data: { role: 'ADMIN' }
  });
  console.log(`✅ Success: ${user.name} elevated to ADMIN.`);
  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
