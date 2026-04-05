importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

// Must match standard config (but compat format)
const firebaseConfig = {
  apiKey: "AIzaSyAOtUMkW1zGB1OJKpfUqU2QzHrcqJWxGZg",
  authDomain: "acoustic-arch-373523.firebaseapp.com",
  projectId: "acoustic-arch-373523",
  storageBucket: "acoustic-arch-373523.firebasestorage.app",
  messagingSenderId: "165706271744",
  appId: "1:165706271744:web:4d1f86939d13ddb2479ce5",
  measurementId: "G-WY94XQN01F"
};

try {
  // Try mapping URL parameters to firebaseConfig if injected dynamically, otherwise fallback to config strings
  const urlParams = new URLSearchParams(location.search);
  if(urlParams.get('firebaseConfig')) {
      Object.assign(firebaseConfig, JSON.parse(urlParams.get('firebaseConfig')));
  }

  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);

    const notificationTitle = payload.notification?.title || payload.data?.title || 'Notification';
    const notificationOptions = {
      body: payload.notification?.body || payload.data?.message || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: payload.data,
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
  });
} catch (e) {
  console.log('[firebase-messaging-sw.js] Failed to init or process background message', e);
}
