const admin = require('firebase-admin');

try {
  // If FIREBASE_SERVICE_ACCOUNT_KEY is a full json string in env
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('[FIREBASE] Admin SDK initialized via JSON string.');
  } 
  // Fallback to separate env variables
  else if (process.env.FIREBASE_PROJECT_ID) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      })
    });
    console.log('[FIREBASE] Admin SDK initialized via separate ENV vars.');
  } else {
    // Attempt fallback to local service account file if it exists, otherwise throw
    console.warn('[FIREBASE] No Service Account provided in env. Push notifications may fail.');
  }
} catch (error) {
  console.error('[FIREBASE INITIALIZATION ERROR]', error);
}

module.exports = admin;
