import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Navbar from '../components/Navbar';
import { initSocket, getSocket } from '../services/socket';
import { LocalNotifications } from '@capacitor/local-notifications';
import { CallProvider } from '../context/CallContext';
import CallInterface from '../components/CallInterface';
import { Toaster, toast } from 'react-hot-toast';
import '../styles/globals.css';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

// Convert VAPID key from base64 string to Uint8Array for browser API
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function subscribeToPush(registration) {
  try {
    const existingSubscription = await registration.pushManager.getSubscription();
    if (existingSubscription) return; // Already subscribed

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    });

    const token = localStorage.getItem('token');
    if (!token) return;

    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://campus-chat-backend.onrender.com';
    await fetch(`${backendUrl}/api/notifications/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(subscription.toJSON())
    });
  } catch (err) {
    console.warn('Push subscription failed:', err);
  }
}

// Pages that DON'T need you to be logged in
const publicPages = ['/login', '/register'];

// Pages that should NEVER show the bottom navbar (like Chat screen)
const hideNavbarPages = ['/login', '/register', '/chat/[id]', '/courses/[id]'];

function MyApp({ Component, pageProps }) {
  const router = useRouter();
  // Must start as false for SSR/hydration compatibility (localStorage not available server-side)
  const [authorized, setAuthorized] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    // 1. Service Worker Registration + Web Push Subscription
    if (typeof window !== 'undefined' && "serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("/sw.js").then(async (reg) => {
          console.log('SW Registered', reg.scope);
          
          // Request Push Permission, then subscribe for background push
          if ("Notification" in window) {
            let permission = Notification.permission;
            if (permission === 'default') {
              permission = await Notification.requestPermission();
            }
            if (permission === 'granted' && VAPID_PUBLIC_KEY) {
              subscribeToPush(reg);
            }
          }
        }).catch(err => console.error('SW Registration failed', err));
      });
    }

    // 2. Offline UX Listeners
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    if (typeof navigator !== 'undefined') setIsOffline(!navigator.onLine);

    // 3. Install Prompt UX
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  useEffect(() => {
    const authCheck = (url) => {
      const path = url.split('?')[0];
      const token = localStorage.getItem('token');

      if (!token && !publicPages.includes(path)) {
        setAuthorized(false);
        router.push('/login');
      } else {
        setAuthorized(true);
        if (token) initSocket();
      }
      setIsReady(true);
    };

    authCheck(router.asPath);

    router.events.on('routeChangeComplete', authCheck);
    return () => router.events.off('routeChangeComplete', authCheck);
  }, [router]);

  // Re-subscribe to push whenever the user logs in (authorized changes)
  useEffect(() => {
    if (!authorized) return;
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.ready.then((reg) => {
      if ('Notification' in window && Notification.permission === 'granted' && VAPID_PUBLIC_KEY) {
        subscribeToPush(reg);
      }
    }).catch(() => {});
  }, [authorized]);

  // Global Push Notification & Sound Manager for Incoming Messages
  useEffect(() => {
    if (!authorized) return;
    const socket = getSocket();
    if (!socket) return;

    const handleGlobalNewMessage = async (msg) => {
      try {
        const currentUser = JSON.parse(localStorage.getItem('user'));
        // Ignore our own messages
        const actualMsg = msg.message || msg;
        const messageSenderId = actualMsg.senderId || actualMsg.sender?.id || actualMsg.sender;
        if (String(messageSenderId) === String(currentUser?.id)) return;
        
        // Don't spam push notifications if the user is already inside this exact chat room
        if (router.pathname === '/chat/[id]' && router.query.id === msg.conversationId) {
           // We are inside the active chat, just play a subtle in-app sound
           const inAppSound = new Audio('/sounds/ding.mp3');
           inAppSound.volume = 0.5;
           inAppSound.play().catch(e => console.log('Audio overlap blocked', e));
           return;
        }

        const senderName = actualMsg.sender?.name || 'New Message';
        const bodyContent = actualMsg.content || 'Sent an attachment';

        // Play alert sound unconditionally
        const alertSound = new Audio('/sounds/ding.mp3');
        alertSound.play().catch(e => console.log('Autoplay blocked', e));

        // If the user's screen is currently on and they are looking at the app
        if (document.visibilityState === 'visible') {
           toast.success(`${senderName}: ${bodyContent}`, {
             icon: '💬',
             position: 'top-center',
             duration: 4000
           });
           return;
        }

        // We are backgrounded, in another page, or phone is asleep: Fire Native Notification & Wake Screen!
        if (typeof window !== 'undefined' && 'capacitor' in window) {
           await LocalNotifications.schedule({
             notifications: [{
               title: senderName,
               body: bodyContent,
               id: Math.floor(Math.random() * 100000),
               schedule: { at: new Date(Date.now() + 100) },
               sound: null,
               attachments: null,
               actionTypeId: "",
               extra: { conversationId: msg.conversationId || actualMsg.conversationId }
             }]
           });
        } else {
           // Fallback for Web PWA standard notifications (which also rings and wakes screen if allowed)
           if (Notification.permission === 'granted') {
             new Notification(senderName, {
               body: bodyContent,
               icon: '/icons/icon-192.png'
             });
           }
        }
      } catch (err) {
        console.error('Notification error', err);
      }
    };

    socket.on('new-message', handleGlobalNewMessage);
    return () => {
      socket.off('new-message', handleGlobalNewMessage);
    };
  }, [authorized, router.pathname, router.query.id]);

  const shouldHideNavbar = hideNavbarPages.includes(router.pathname);

  // By returning an empty or minimal screen until `isReady` is true, 
  // we prevent the "page flashing" effect where the UI renders partially before auth is checked.
  if (!isReady) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        {/* Silent minimal loading state to avoid jarring flashes */}
      </div>
    );
  }

  return (
    <CallProvider>
      <div className="min-h-screen bg-gray-50">
        <Toaster />
        <main className={shouldHideNavbar ? '' : 'pb-20'}>
          {isOffline && (
            <div className="bg-rose-500 text-white text-center py-2 text-sm font-medium sticky top-0 z-50 shadow-sm shadow-rose-500/20">
              You are offline. Some features may be unavailable.
            </div>
          )}
          {deferredPrompt && (
            <div className="bg-primary-600 text-white text-center py-3 px-4 text-sm font-medium sticky top-0 z-50 flex justify-center items-center gap-4 shadow-sm shadow-primary-600/20 animate-fade-in-down">
              <span>Install Campus Chat as an App!</span>
              <button 
                onClick={() => {
                  deferredPrompt.prompt();
                  deferredPrompt.userChoice.then((choiceResult) => {
                    if (choiceResult.outcome === 'accepted') {
                      setDeferredPrompt(null);
                    }
                  });
                }}
                className="bg-white/20 hover:bg-white/30 text-white px-4 py-1.5 rounded-full font-bold text-xs backdrop-blur-sm transition-all shadow-sm"
              >
                Install
              </button>
            </div>
          )}
          <Component {...pageProps} />
        </main>
        {authorized && !shouldHideNavbar && <Navbar />}
        <CallInterface />
      </div>
    </CallProvider>
  );
}

export default MyApp;
