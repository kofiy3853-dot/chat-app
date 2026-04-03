import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Navbar from '../components/Navbar';
import { initSocket, getSocket } from '../services/socket';
import { LocalNotifications } from '@capacitor/local-notifications';
import { CallProvider } from '../context/CallContext';
import { ThemeProvider } from '../context/ThemeContext';
import { initOneSignal } from '../services/oneSignal';
import dynamic from 'next/dynamic';
import { Toaster, toast } from 'react-hot-toast';
import useAuthRedirect from '../hooks/useAuthRedirect';
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

    const rawUrl = process.env.NEXT_PUBLIC_API_URL || 'https://campus-chat-backend.onrender.com';
    const baseUrl = rawUrl.replace(/\/api$/, '');
    await fetch(`${baseUrl}/api/notifications/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(subscription.toJSON())
    });
  } catch (err) {
    console.warn('Push subscription failed:', err);
  }
}

const publicPages = ['/login', '/register'];
const hideNavbarPages = ['/login', '/register', '/chat/[id]', '/courses/[id]', '/events/create', '/anonymous/create'];

export default function MyApp({ Component, pageProps }) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  // 1. Core Lifecycle & Global Side-effects
  useEffect(() => {
    // 1.1 Service Worker (Update Skip/Claim)
    if (typeof window !== 'undefined' && "serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("/sw.js").then(reg => {
          reg.onupdatefound = () => {
            const installing = reg.installing;
            installing.onstatechange = () => {
              if (installing.state === 'installed' && navigator.serviceWorker.controller) {
                window.location.reload(); // Refresh immediately on PWA update
              }
            };
          };
          if (reg.active) {
            const userStr = localStorage.getItem('user');
            if (userStr) initOneSignal(JSON.parse(userStr));
          }
        }).catch(err => console.error('SW error', err));
      });
    }

    // 1.2 Health Ping & Global Listeners
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    if (typeof navigator !== 'undefined') setIsOffline(!navigator.onLine);

    const handleBeforeInstallPrompt = (e) => { e.preventDefault(); setDeferredPrompt(e); };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    const ping = () => {
      const url = process.env.NEXT_PUBLIC_API_URL || '';
      fetch(url.replace(/\/api$/, '') + '/health').catch(() => {});
    };
    ping();

    // 1.4 Initial Auth Hydration
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    if (token && user) {
       setAuthorized(true);
       initSocket();
    }
    setIsReady(true);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // 2. Centralized Auth & Role Routing Hook
  const currentUser = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user')) : null;
  useAuthRedirect(currentUser, isReady);

  // 3. Splash Screen / Loader Management
  useEffect(() => {
    if (isReady) {
      const loader = document.getElementById('initial-loader');
      if (loader) {
        loader.style.opacity = '0';
        setTimeout(() => { loader.style.display = 'none'; loader.remove(); }, 500);
      }
    }
  }, [isReady]);

  if (!isReady) return null;

  // 3. UI Decision Helpers
  const userStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
  const user = userStr ? JSON.parse(userStr) : null;
  // Nana sees the navbar on the communicator (/), but hides it on her Terminal (/nana)
  const isNanaTerminal = router.pathname.startsWith('/nana');
  const shouldHideNavbar = hideNavbarPages.includes(router.pathname) || (user?.role === 'NANA' && isNanaTerminal);

  return (
    <ThemeProvider>
    <CallProvider>
      <div className="min-h-screen font-['Outfit',sans-serif]" style={{ backgroundColor: 'var(--bg-page)', color: 'var(--text-primary)', transition: 'background-color 0.3s ease, color 0.3s ease' }}>
        <Toaster 
          position="top-center"
          reverseOrder={false}
          gutter={8}
          toastOptions={{
            duration: 5000,
            style: {
              background: '#fff',
              color: '#1e293b',
              borderRadius: '20px',
              padding: '12px 20px',
              fontSize: '14px',
              fontWeight: '700',
              boxShadow: '0 10px 40px -10px rgba(0,0,0,0.15)',
            },
            success: {
              iconTheme: {
                primary: '#4f46e5',
                secondary: '#fff',
              },
            },
            error: {
              style: {
                background: '#1e293b',
                color: '#fff',
              },
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
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
    </ThemeProvider>
  );
}
