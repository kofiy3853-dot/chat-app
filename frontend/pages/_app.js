import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Navbar from '../components/Navbar';
import { initSocket, getSocket } from '../services/socket';
import { LocalNotifications } from '@capacitor/local-notifications';
import { CallProvider } from '../context/CallContext';
import { ThemeProvider } from '../context/ThemeContext';
import { requestFirebaseNotificationPermission, onMessageListener } from '../config/firebase';
import { pushAPI } from '../services/api';
import dynamic from 'next/dynamic';
import { Toaster, toast } from 'react-hot-toast';
import useAuthRedirect from '../hooks/useAuthRedirect';
import { BellIcon } from '@heroicons/react/24/outline';
import Head from 'next/head';
import { useTheme } from '../context/ThemeContext';
import '../styles/globals.css';

// Dynamic theme-color sync for mobile status bar
function ThemeColorSync() {
  const { theme } = useTheme();
  const [metaColor, setMetaColor] = useState('#2e8bc0');

  useEffect(() => {
    // 0.1s delay to ensure the data-theme attribute is applied to the DOM 
    // and CSS variables are recalculated by the browser
    const timer = setTimeout(() => {
      const computedStyle = getComputedStyle(document.documentElement);
      const statusBarColor = computedStyle.getPropertyValue('--status-bar').trim();
      
      if (statusBarColor) {
        setMetaColor(statusBarColor);
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, [theme]);

  return (
    <Head>
      <meta name="theme-color" content={metaColor} />
    </Head>
  );
}

const CallInterface = dynamic(() => import('../components/CallInterface'), { ssr: false });



import { playNotificationSound } from '../utils/sound';

const publicPages = ['/login', '/register'];
const hideNavbarPages = ['/login', '/register', '/events/create', '/anonymous/create', '/chat/[id]', '/courses/[id]', '/nana'];

export default function MyApp({ Component, pageProps }) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [user, setUser] = useState(null);

  // 1. Initial Lifecycle & Auth Hydration
  useEffect(() => {
    // 1.1 Auth Hydration (Safe from hydration mismatches)
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    
    if (token && userStr) {
      try {
        const parsedUser = JSON.parse(userStr);
        setUser(parsedUser);
        setAuthorized(true);
        initSocket();
      } catch (e) {
        console.error('Invalid user data in storage');
      }
    }
    setIsReady(true);

    // 1.2 Service Worker & Firebase Push Setup
    if (typeof window !== 'undefined' && "serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("/sw.js").then(reg => {
          if (reg.active && localStorage.getItem('token')) {
            requestFirebaseNotificationPermission().then(token => {
              if(token) pushAPI.updateFcmToken(token).catch(console.error);
            }).catch(console.warn);
          }
        }).catch(err => console.error('SW error', err));
      });
    }

    // 1.3 Online/Offline Listeners
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    if (typeof navigator !== 'undefined') setIsOffline(!navigator.onLine);

    const handleBeforeInstallPrompt = (e) => { e.preventDefault(); setDeferredPrompt(e); };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // 2. Global Notification & Socket Events
  useEffect(() => {
    if (!authorized) return;
    const socket = getSocket();
    if (!socket) return;

    const handleNewMessage = (data) => {
      // Don't show toast if we are already in the conversation
      if (router.pathname === '/chat/[id]' && router.query.id === data.conversationId) return;
      
      const msg = data.message;
      if (msg.senderId === user?.id) return; // Don't notify self

      playNotificationSound();

      toast.custom((t) => (
        <div
          className={`${
            t.visible ? 'animate-in fade-in slide-in-from-top-full duration-300' : 'animate-out fade-out slide-out-to-top-full duration-300'
          } max-w-sm w-full bg-white/95 backdrop-blur-md shadow-2xl rounded-[24px] pointer-events-auto flex border border-primary-100 p-4 cursor-pointer active:scale-95 transition-all mb-4`}
          onClick={() => {
            router.push(`/chat/${data.conversationId}`);
            toast.dismiss(t.id);
          }}
        >
          <div className="flex-1 w-0">
            <div className="flex items-center">
              <div className="flex-shrink-0 pt-0.5">
                <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center text-white font-bold shadow-lg shadow-primary-500/20">
                  {msg.sender?.name?.charAt(0) || 'U'}
                </div>
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-black text-slate-900 tracking-tight">
                  {msg.sender?.name || 'New Message'}
                </p>
                <p className="text-xs font-medium text-slate-500 truncate mt-0.5">
                  {msg.content || 'Sent an attachment'}
                </p>
              </div>
            </div>
          </div>
        </div>
      ), { duration: 4000, position: 'top-center' });
    };

    const handleNewNotification = (data) => {
      if (router.pathname === '/activity') return;
      
      // Fix: Don't show generic notification toast for messages/mentions 
      // because handleNewMessage already shows a much prettier toast for them.
      if (data.notification?.type === 'MESSAGE' || data.notification?.type === 'MENTION') return;

      playNotificationSound();

      toast.custom((t) => (
        <div
          className={`${
            t.visible ? 'animate-in fade-in zoom-in-95' : 'animate-out fade-out zoom-out-95'
          } max-w-xs w-full bg-slate-900 shadow-2xl rounded-2xl p-4 flex items-center space-x-3 text-white border border-slate-800`}
          onClick={() => {
            router.push('/activity');
            toast.dismiss(t.id);
          }}
        >
          <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center">
            <BellIcon className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-black uppercase tracking-widest">{data.title || 'New Alert'}</p>
            <p className="text-[10px] opacity-70 mt-0.5 truncate">{data.content}</p>
          </div>
        </div>
      ), { duration: 5000 });
    };

    socket.on('new-message', handleNewMessage);
    socket.on('new-notification', handleNewNotification);

    // FCM Foreground Message handling
    const unsubscribeFCM = onMessageListener((payload) => {
      if(payload?.notification) {
        toast.custom((t) => (
          <div
            className="max-w-sm w-full bg-[#2e8bc0] rounded flex items-center p-3 text-white cursor-pointer shadow-xl animate-in fade-in slide-in-from-top-full"
            onClick={() => {
              if (payload.data?.url) router.push(payload.data.url);
              toast.dismiss(t.id);
            }}
          >
            <div className="flex-1">
              <p className="text-sm font-semibold">{payload.notification.title}</p>
              <p className="text-xs mt-1">{payload.notification.body}</p>
            </div>
          </div>
        ), { duration: 4000 });
      }
    });

    return () => {
      socket.off('new-message', handleNewMessage);
      socket.off('new-notification', handleNewNotification);
      if (unsubscribeFCM) unsubscribeFCM();
    };
  }, [authorized, router.pathname, router.query.id, user?.id]);

  // 3. Centralized Auth & Role Routing Hook
  useAuthRedirect(user, isReady);

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
  const normalizedPath = router.pathname;
  const isDynamicChat = normalizedPath === '/chat/[id]';
  const isDynamicCourse = normalizedPath === '/courses/[id]';
  const shouldHideNavbar = hideNavbarPages.includes(normalizedPath) || isDynamicChat || isDynamicCourse;

  return (
    <ThemeProvider>
    <CallProvider>
      <ThemeColorSync />
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
        <main className={shouldHideNavbar ? 'relative h-[100dvh] overflow-hidden flex flex-col' : 'pb-[calc(env(safe-area-inset-bottom)+90px)] relative'}>
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
