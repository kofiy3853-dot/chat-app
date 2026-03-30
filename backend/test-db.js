const prisma = require('./prisma/client');

async function main() {
  try {
    console.log('Testing connection to Supabase PostgreSQL...');
    const userCount = await prisma.user.count();
    console.log(`Connection successful! Total users: ${userCount}`);
    
    const users = await prisma.user.findMany({
      take: 5,
      select: { id: true, email: true, name: true, role: true }
    });
    
    console.log('Sample users:', JSON.stringify(users, null, 2));
    
    const tables = ['User', 'Conversation', 'Message', 'Course'];
    for (const table of tables) {
      const count = await prisma[table.toLowerCase()].count();
      console.log(`${table} count: ${count}`);
    }
    
  } catch (error) {
    console.error('Failed to connect to database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
