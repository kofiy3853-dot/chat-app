const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const prisma = require('../prisma/client');

async function main() {
  console.log('--- DATABASE IDENTITY CHECK ---');
  
  // 1. Check for Nana's specific system ID
  const NANA_ID = '7951b52c-b14e-486a-a802-8e0a9fa2495b';
  const nana = await prisma.user.findUnique({
    where: { id: NANA_ID }
  });

  if (nana) {
    console.log('✅ Nana Found with System ID');
    console.log(`   Name: ${nana.name}`);
    console.log(`   Role: ${nana.role}`);
    console.log(`   Email: ${nana.email}`);
    
    if (nana.role !== 'NANA') {
      console.log('⚠️ ALERT: Nana role is NOT set to NANA. Fixing it now...');
      await prisma.user.update({
        where: { id: NANA_ID },
        data: { role: 'NANA' }
      });
      console.log('✅ Fixed: Nana role is now NANA.');
    }
  } else {
    console.log('❌ Nana NOT FOUND with System ID.');
    
    // Check if she exists with name "Nana" but different ID
    const nanaByRole = await prisma.user.findFirst({
      where: { role: 'NANA' }
    });
    
    if (nanaByRole) {
      console.log(`⚠️ Nana exists with role NANA but different ID: ${nanaByRole.id}`);
    } else {
      console.log('🚀 SYSTEM ACTION: Nana does not exist. Creating her now...');
      // Note: Use a dummy password, she shouldn't login normally anyway
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('system_nana_ignore', 10);
      
      await prisma.user.create({
        data: {
          id: NANA_ID,
          name: 'Nana',
          email: 'nana@campus.smart',
          password: hashedPassword,
          role: 'NANA',
          department: 'AI Core'
        }
      });
      console.log('✅ Nana identity generated successfully.');
    }
  }

  // 2. Role Distribution
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true }
  });
  
  console.log(`\n--- USER HUB ---`);
  users.forEach(u => {
     console.log(`[${u.role}] ${u.name} (${u.email})`);
  });

  const admins = users.filter(u => u.role === 'ADMIN');
  console.log(`\nAdmins: ${admins.length}`);
  console.log(`Total Users: ${users.length}`);

  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
