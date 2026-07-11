const prisma = require('../prisma/client');

const NANA_USER_ID = '7951b52c-b14e-486a-a802-8e0a9fa2495b';

/**
 * Ensures the Nana system user identity exists in the database.
 * This should be called during server startup to prevent 500 errors in other components.
 */
async function initializeNana() {
  try {
    if (!prisma) {
      console.warn('[NANA] Database not initialized. Skipping system identity setup.');
      return;
    }

    if (typeof prisma.$connect !== 'function') {
      console.warn('[NANA] Database client not available. Skipping system identity setup.');
      return;
    }

    console.log('[NANA] Verifying system identity...');
    
    // Check by role to ensure we have the official system character
    const nanaExists = await prisma.user.findFirst({
      where: { role: 'NANA' }
    }).catch(err => {
      console.warn('[NANA] Database query failed:', err.message);
      return null;
    });

    if (nanaExists === null) {
      console.warn('[NANA] Could not verify system identity due to database error.');
      return;
    }

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
      }).catch(err => {
        console.warn('[NANA] Could not create system identity:', err.message);
        return null;
      });
      
      if (nana) {
        console.log('✓ [NANA] System character initialized successfully:', nana.name);
      }
    } else {
      console.log('✓ [NANA] System identity verified:', nanaExists.name);
    }
  } catch (error) {
    console.error('✗ [NANA] Initialization error:', error.message);
  }
}

module.exports = { initializeNana, NANA_USER_ID };
