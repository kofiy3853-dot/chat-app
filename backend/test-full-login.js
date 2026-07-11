require('dotenv').config();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Load the fixed Prisma client
const prisma = require('./prisma/client');

if (!prisma) {
  console.error('FATAL: Prisma client is null!');
  process.exit(1);
}

console.log('=== Full Login Flow Test ===\n');

const testEmail = 'efua@student.campus.edu';
const testPassword = 'password123';

async function testLogin() {
  try {
    // Step 1: Find user
    console.log(`Looking up user: ${testEmail}`);
    const user = await prisma.user.findUnique({
      where: { email: testEmail },
      select: { id: true, email: true, password: true, role: true, name: true }
    });

    if (!user) {
      console.error('FAIL: User not found');
      process.exit(1);
    }
    console.log(`Found: ${user.name} (${user.role})`);

    // Step 2: Verify password
    console.log('\nVerifying password...');
    const isValid = await bcrypt.compare(testPassword, user.password);
    console.log(`Password valid: ${isValid ? 'PASS' : 'FAIL'}`);

    if (!isValid) {
      process.exit(1);
    }

    // Step 3: Generate JWT
    console.log('\nGenerating JWT token...');
    if (!process.env.JWT_SECRET) {
      console.error('FAIL: JWT_SECRET not set');
      process.exit(1);
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );
    console.log(`JWT generated: PASS`);
    console.log(`Token: ${token.substring(0, 50)}...`);

    // Step 4: Verify we can query with the user
    console.log('\nQuerying user conversations...');
    const conversations = await prisma.conversationParticipant.findMany({
      where: { userId: user.id },
      include: { conversation: { select: { id: true, name: true, type: true } } }
    });
    console.log(`Found ${conversations.length} conversations`);

    // Step 5: Query messages
    console.log('\nQuerying recent messages...');
    const messages = await prisma.message.findMany({
      where: { conversationId: conversations[0]?.conversationId },
      take: 3,
      include: { sender: { select: { name: true } } }
    });
    console.log(`Found ${messages.length} messages`);

    console.log('\n=== ALL TESTS PASSED ===');
    console.log('\nTest credentials:');
    console.log('  Email: efua@student.campus.edu');
    console.log('  Password: password123');
    console.log('  Role: STUDENT');

  } catch (err) {
    console.error('ERROR:', err.message);
    console.error(err.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testLogin();
