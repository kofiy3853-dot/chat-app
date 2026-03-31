import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Navbar from '../components/Navbar';
import { initSocket, getSocket } from '../services/socket';
import { LocalNotifications } from '@capacitor/local-notifications';
import { CallProvider } from '../context/CallContext';
import dynamic from 'next/dynamic';
import { Toaster, toast } from 'react-hot-toast';
import '../styles/globals.css';

const CallInterface = dynamic(() => import('../components/CallInterface'), { ssr: false });

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

// Convert VAPID key from base64 string to Uint8Array for browser API
function urlBase64ToUint8Array(base64String) {
  if (!base64String) return null;
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
    if (existingSubscription) return; 

    const key = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
    if (!key) return;

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: key
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

const publicPages = ['/login', '/register'];
const hideNavbarPages = ['/login', '/register', '/chat/[id]', '/courses/[id]'];

export default function MyApp({ Component, pageProps }) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    // 1. Service Worker & Push
    if (typeof window !== 'undefined' && "serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("/sw.js").then(async (reg) => {
          if ("Notification" in window) {
            let permission = Notification.permission;
            if (permission === 'default') {
              permission = await Notification.requestPermission();
            }
            if (permission === 'granted' && VAPID_PUBLIC_KEY) {
              subscribeToPush(reg);
            }
          }
        }).catch(err => console.error('SW error', err));
      });
    }

    // 2. OfflineUX
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    if (typeof navigator !== 'undefined') setIsOffline(!navigator.onLine);

    // 3. Install
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // 4. Ping backend
    const pingBackend = async () => {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://campus-chat-backend.onrender.com';
      try { await fetch(`${backendUrl}/health`).catch(() => {}); } catch(e) {}
    };
    pingBackend();

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

  useEffect(() => {
    if (!authorized) return;
    navigator.serviceWorker.ready.then((reg) => {
      if ('Notification' in window && Notification.permission === 'granted' && VAPID_PUBLIC_KEY) {
        subscribeToPush(reg);
      }
    }).catch(() => {});
  }, [authorized]);

  useEffect(() => {
    if (!authorized) return;
    const socket = getSocket();
    if (!socket) return;
    const handleGlobalNewMessage = async (msg) => {
      try {
        const currentUser = JSON.parse(localStorage.getItem('user'));
        const actualMsg = msg.message || msg;
        const messageSenderId = actualMsg.senderId || actualMsg.sender?.id || actualMsg.sender;
        if (String(messageSenderId) === String(currentUser?.id)) return;
        
        if (router.pathname === '/chat/[id]' && router.query.id === msg.conversationId) {
           new Audio('/sounds/ding.mp3').play().catch(() => {});
           return;
        }

        const senderName = actualMsg.sender?.name || 'New Message';
        const bodyContent = actualMsg.content || 'Sent an attachment';
        new Audio('/sounds/ding.mp3').play().catch(() => {});

        if (document.visibilityState === 'visible') {
           toast.success(`${senderName}: ${bodyContent}`, { icon: '💬', position: 'top-center', duration: 4000 });
           return;
        }

        if (typeof window !== 'undefined' && 'capacitor' in window) {
           await LocalNotifications.schedule({
             notifications: [{
               title: senderName,
               body: bodyContent,
               id: Math.floor(Math.random() * 100000),
               schedule: { at: new Date(Date.now() + 100) },
               extra: { conversationId: msg.conversationId || actualMsg.conversationId }
             }]
           });
        } else if (Notification.permission === 'granted') {
           new Notification(senderName, { body: bodyContent, icon: '/icons/icon-192.png' });
        }
      } catch (err) { console.error('Notify Error', err); }
    };
    socket.on('new-message', handleGlobalNewMessage);
    return () => { socket.off('new-message', handleGlobalNewMessage); };
  }, [authorized, router.pathname, router.query.id]);

  const shouldHideNavbar = hideNavbarPages.includes(router.pathname);

  // Return nothing while checking auth - the static splash screen in _document.js handles the loading state instantly
  if (!isReady) return null;

  return (
    <CallProvider>
      <div className="min-h-screen bg-gray-50 font-['Outfit',sans-serif]">
        <Toaster />
        <main className={shouldHideNavbar ? '' : 'pb-20'}>
          {isOffline && (
            <div className="bg-rose-500 text-white text-center py-2 text-sm font-black uppercase tracking-widest sticky top-0 z-50 shadow-lg">
              Offline Mode
            </div>
          )}
          {deferredPrompt && (
            <div className="bg-primary-600 text-white text-center py-3 px-4 text-sm font-black sticky top-0 z-50 flex justify-center items-center gap-4 shadow-xl animate-fade-in-down">
              <span className="uppercase tracking-tight">Experience Campus Chat as an App</span>
              <button 
                onClick={() => {
                  deferredPrompt.prompt();
                  deferredPrompt.userChoice.then(res => res.outcome === 'accepted' && setDeferredPrompt(null));
                }}
                className="bg-white text-primary-600 px-6 py-1.5 rounded-full font-black text-[10px] uppercase tracking-widest shadow-md hover:bg-slate-50 transition-all"
              >
                Install Now
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
