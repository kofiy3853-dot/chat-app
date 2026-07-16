require('dotenv').config();
const prisma = require('./prisma/client');
const bcrypt = require('bcryptjs');

async function resetAndVerifyAdmin() {
  const email = process.argv[2];
  const newPassword = process.argv[3];

  if (!email || !newPassword) {
    console.error('Usage: node force_admin_password.js <email> <new-password>');
    process.exit(1);
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      console.log('❌ Admin user not found with email:', email);
      return;
    }

    console.log('Found user:', user.name, 'Role:', user.role);

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword }
    });

    console.log('✅ Password successfully reset');

  } catch (error) {
    console.error('Error resetting password:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetAndVerifyAdmin();
