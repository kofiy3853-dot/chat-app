const prisma = require('./prisma/client');
async function testConnection() {
  try {
    console.log('Testing connection to Supabase PostgreSQL...');
    const result = await prisma.$queryRaw`SELECT 1 AS alive`;
    console.log('Result:', result);
    console.log('✅ DATABASE IS WELL CONNECTED!');
  } catch (error) {
    console.error('❌ DATABASE CONNECTION FAILED:');
    console.error(error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
