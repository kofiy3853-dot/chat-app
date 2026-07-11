const admin = require('firebase-admin');

let initialized = false;

try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log(`[FIREBASE] Initialized successfully. Project: ${serviceAccount.project_id} | Account: ${serviceAccount.client_email}`);
    initialized = true;
  } 
  else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      })
    });
    console.log(`[FIREBASE] Initialized successfully. Project: ${process.env.FIREBASE_PROJECT_ID} | Account: ${process.env.FIREBASE_CLIENT_EMAIL}`);
    initialized = true;
  } else {
    console.warn('[FIREBASE] Credentials not found. Push notifications will be disabled. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY to enable.');
    initialized = false;
  }
} catch (error) {
  console.error('[FIREBASE INITIALIZATION ERROR]', error.message);
  console.warn('[FIREBASE] Push notifications will be disabled.');
  initialized = false;
}

// Export admin with a flag indicating initialization status
admin.initialized = initialized;
module.exports = admin;
