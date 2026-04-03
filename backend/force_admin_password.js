require('dotenv').config();
const prisma = require('./prisma/client');
const bcrypt = require('bcryptjs');

async function resetAndVerifyAdmin() {
  const email = 'redeemer0420233803d@ktu.edu.gh';
  const newPassword = 'Admin@123';
  
  try {
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      console.log('❌ Admin user not found with email:', email);
      return;
    }

    console.log('Found user:', user.name, 'Role:', user.role);

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword }
    });

    console.log('✅ Password successfully reset to:', newPassword);
    
  } catch (error) {
    console.error('Error resetting password:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetAndVerifyAdmin();
