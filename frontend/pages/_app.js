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
    // 1.1 Service Worker & Push (OneSignal)
    if (typeof window !== 'undefined' && "serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("/sw.js").then(async (reg) => {
          if ("Notification" in window) {
            let permission = Notification.permission;
            if (permission === 'default') {
              permission = await Notification.requestPermission();
            }
            if (permission === 'granted' && VAPID_PUBLIC_KEY) {
              const currentUser = JSON.parse(localStorage.getItem('user'));
              if (currentUser) initOneSignal(currentUser);
            }
          }
        }).catch(err => console.error('SW error', err));
      });
    }

    // 1.2 Offline Monitoring
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    if (typeof navigator !== 'undefined') setIsOffline(!navigator.onLine);

    // 1.3 Install Prompt
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // 1.4 Backend Health Ping
    const pingBackend = async () => {
      try {
        const rawUrl = process.env.NEXT_PUBLIC_API_URL || 'https://campus-chat-backend.onrender.com';
        const baseUrl = rawUrl.replace(/\/api$/, '');
        await fetch(`${baseUrl}/health`).catch(() => {});
      } catch(e) {}
    };
    pingBackend();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // 2. Unified Auth & RBAC Logic
  const authCheck = (url) => {
    if (!router.isReady) return;
    
    const path = url.split('?')[0];
    const userStr = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    const user = userStr ? JSON.parse(userStr) : null;

    // A. Public Routes Bypass
    if (publicPages.includes(path)) {
      setAuthorized(!!token);
      setIsReady(true);
      
      // If logged in and trying to access /login, redirect to their home
      if (token && user && path === '/login') {
         const target = user.role === 'NANA' ? '/nana' : '/';
         if (path !== target) router.replace(target);
      }
      return;
    }

    // B. Guard Protected Routes
    if (!token || !user) {
      setAuthorized(false);
      setIsReady(true);
      if (path !== '/login') router.replace('/login');
      return;
    }

    // C. Role-Based Access Control (RBAC)
    const role = user.role || 'STUDENT';

    // C.1 Nana Restriction (Nana ONLY allowed on /nana)
    if (role === 'NANA') {
      if (!path.startsWith('/nana') && path !== '/logout') {
        console.warn(`[RBAC] Nana role unauthorized for path: ${path}. Redirecting to Hub.`);
        router.replace('/nana');
        return;
      }
    }

    // C.2 Student/Instructor Protection
    if ((role === 'STUDENT' || role === 'INSTRUCTOR') && path.startsWith('/admin')) {
      console.warn(`[RBAC] Access Denied for role ${role} to ${path}`);
      router.replace('/');
      return;
    }

    // Success! 
    setAuthorized(true);
    setIsReady(true);
    
    // Auto-init socket if not already done
    if (token) initSocket();
  };

  useEffect(() => {
    // Initial check on mount/load
    authCheck(router.asPath);

    // Watch for route transitions
    const handleRouteChange = (url) => authCheck(url);
    router.events.on('routeChangeStart', handleRouteChange);
    
    return () => router.events.off('routeChangeStart', handleRouteChange);
  }, [router.isReady, router.asPath]);

  // 3. UI Decision Helpers
  const shouldHideNavbar = hideNavbarPages.includes(router.pathname) || (authorized && JSON.parse(localStorage.getItem('user'))?.role === 'NANA');

  if (!isReady) return null;

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
