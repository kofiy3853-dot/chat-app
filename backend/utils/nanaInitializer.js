const prisma = require('../prisma/client');

const NANA_USER_ID = '7951b52c-b14e-486a-a802-8e0a9fa2495b';

/**
 * Ensures the Nana system user identity exists in the database.
 * This should be called during server startup to prevent 500 errors in other components.
 */
async function initializeNana() {
  try {
    console.log('[NANA] Verifying system identity...');
    
    // Check by role to ensure we have the official system character
    const nanaExists = await prisma.user.findFirst({
      where: { role: 'NANA' }
    });

    if (!nanaExists) {
      console.log('[NANA] System user not found in database. Initializing default identity...');
      
      const nana = await prisma.user.create({
        data: {
          id: NANA_USER_ID,
          email: 'nana.agent@ktu.edu.gh', // Normalized system email
          password: 'SYSTEM_MANAGED_IDENTITY', 
          name: 'Nana AI Agent',
          role: 'NANA',
          avatar: 'https://img.icons8.com/isometric/512/bot.png',
          department: 'System Services',
          faculty: 'KTU Virtual Campus'
        }
      });
      
      console.log('✓ [NANA] System character initialized successfully:', nana.name);
    } else {
      console.log('✓ [NANA] System identity verified:', nanaExists.name);
    }
  } catch (error) {
    console.error('✗ [NANA] Failed to initialize system identity:', error.message);
  }
}

module.exports = { initializeNana, NANA_USER_ID };
