const admin = require('firebase-admin');

try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log(`[FIREBASE] Initialized successfully. Project: ${serviceAccount.project_id} | Account: ${serviceAccount.client_email}`);
  } 
  else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      })
    });
    console.log(`[FIREBASE] Initialized successfully. Project: ${process.env.FIREBASE_PROJECT_ID} | Account: ${process.env.FIREBASE_CLIENT_EMAIL}`);
  } else {
    // REQUIREMENT 1: Throw error if credentials missing
    throw new Error('MISSING FIREBASE CREDENTIALS: Set FIREBASE_SERVICE_ACCOUNT_KEY or separate PROJECT_ID/PRIVATE_KEY environment variables.');
  }
} catch (error) {
  console.error('[FIREBASE INITIALIZATION ERROR]', error.message);
  // In production, we throw to prevent inconsistent state, but we log strictly here
  if (process.env.NODE_ENV === 'production') throw error;
}

module.exports = admin;
