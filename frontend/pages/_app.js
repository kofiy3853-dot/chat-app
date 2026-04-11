import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import PageWrapper from '../components/PageWrapper';
import Navbar from '../components/Navbar';
import { getSocket } from '../services/socket';
import { LocalNotifications } from '@capacitor/local-notifications';
import { CallProvider } from '../context/CallContext';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { requestFirebaseNotificationPermission, onMessageListener } from '../config/firebase';
import { pushAPI } from '../services/api';
import dynamic from 'next/dynamic';
import { Toaster, toast } from 'react-hot-toast';
import useAuthRedirect from '../hooks/useAuthRedirect';
import { BellIcon } from '@heroicons/react/24/outline';
import Head from 'next/head';
import { playNotificationSound } from '../utils/sound';
import '../styles/globals.css';

// ─── Theme Color Sync (mobile status bar) ─────────────────────────────────────
function ThemeColorSync() {
  const { theme } = useTheme();
  const [metaColor, setMetaColor] = useState('#2e8bc0');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const computedStyle = getComputedStyle(document.documentElement);
    const statusBarColor = computedStyle.getPropertyValue('--status-bar').trim();
    if (statusBarColor) setMetaColor(statusBarColor);
  }, [theme]);

  return (
    <Head>
      <meta name="theme-color" content={metaColor} />
    </Head>
  );
}

// ─── Auth-aware Loader ────────────────────────────────────────────────────────
function AuthLoader() {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, backgroundColor: 'var(--bg-page)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', zIndex: 99999
      }}
    >
      <div style={{
        width: 56, height: 56,
        background: 'linear-gradient(to top right, #2E8BC0, #1a6a92)',
        borderRadius: '1.25rem',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 20px 40px -10px rgba(46,139,192,0.4)',
        marginBottom: '1.5rem'
      }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        {[0, 0.15, 0.3].map((delay, i) => (
          <div key={i} style={{
            width: 8, height: 8, borderRadius: '50%', background: '#2E8BC0',
            animation: 'bounce 0.6s infinite alternate',
            animationDelay: `${delay}s`
          }} />
        ))}
      </div>
      <style>{`@keyframes bounce { to { transform: translateY(-6px); opacity: 0.4; } }`}</style>
    </div>
  );
}

const CallInterface = dynamic(() => import('../components/CallInterface'), { ssr: false });

const hideNavbarPages = ['/login', '/register', '/events/create', '/anonymous/create', '/chat/[id]', '/courses/[id]', '/nana'];

// ─── Inner App (has access to AuthContext) ────────────────────────────────────
function AppContent({ Component, pageProps }) {
  const router = useRouter();
  const { user, loading, isAuthenticated } = useAuth();
  const [isOffline, setIsOffline]         = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  // ── Auth-aware Redirects ───────────────────────────────────────────────────
  useAuthRedirect();

  // Deduplication cache for notifications
  const notifiedIdsRef = useRef([]);

  // ── PWA / Offline / SW Setup ───────────────────────────────────────────────
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      window.addEventListener('load', async () => {
        try {
          const reg = await navigator.serviceWorker.register('/sw.js');
          console.log('[SW] Registered successfully');

          if (localStorage.getItem('token')) {
            const token = await requestFirebaseNotificationPermission();
            if (token) {
              await pushAPI.updateFcmToken(token).catch(() => {});
            }
          }
        } catch (err) {
          console.warn('[SW] Registration failed:', err.message);
        }
      });
    }

    const handleOnline  = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    if (typeof navigator !== 'undefined') setIsOffline(!navigator.onLine);

    const handleBeforeInstallPrompt = (e) => { e.preventDefault(); setDeferredPrompt(e); };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    const loader = document.getElementById('initial-loader');
    if (loader) {
      loader.style.opacity = '0';
      setTimeout(() => { loader.style.display = 'none'; loader.remove?.(); }, 500);
    }

    const clearBadge = () => {
      if ('clearAppBadge' in navigator) {
        navigator.clearAppBadge().catch(() => {});
      }
    };
    clearBadge();
    window.addEventListener('focus', clearBadge);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('focus', clearBadge);
    };
  }, []);

  // ── Global Socket Notifications ────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) return;
    const socket = getSocket();
    if (!socket) return;

    const handleNewMessage = (data) => {
      if (router.pathname === '/chat/[id]' && router.query.id === data.conversationId) return;
      const msg = data.message;
      if (msg.senderId === user?.id) return;

      const msgId = msg.id || msg.tempId;
      if (msgId && notifiedIdsRef.current.includes(msgId)) return;
      if (msgId) notifiedIdsRef.current = [msgId, ...notifiedIdsRef.current].slice(0, 50);

      playNotificationSound();
      toast.custom((t) => (
        <div
          className={`${t.visible ? 'animate-in fade-in slide-in-from-top-full duration-300' : 'animate-out fade-out slide-out-to-top-full duration-300'} max-w-sm w-full bg-white/95 backdrop-blur-md shadow-2xl rounded-[24px] pointer-events-auto flex border border-primary-100 p-4 cursor-pointer active:scale-95 transition-all mb-4`}
          onClick={() => { router.push(`/chat/${data.conversationId}`); toast.dismiss(t.id); }}
        >
          <div className="flex-1 w-0">
            <div className="flex items-center">
              <div className="flex-shrink-0 pt-0.5">
                <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center text-white font-bold shadow-lg shadow-primary-500/20">
                  {msg.sender?.name?.charAt(0) || 'U'}
                </div>
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-black text-slate-900 tracking-tight">{msg.sender?.name || 'New Message'}</p>
                <p className="text-xs font-medium text-slate-500 truncate mt-0.5">{msg.content || 'Sent an attachment'}</p>
              </div>
            </div>
          </div>
        </div>
      ), { duration: 4000, position: 'top-center' });
    };

    socket.on('new-message', handleNewMessage);
    return () => { socket.off('new-message', handleNewMessage); };
  }, [isAuthenticated, router.pathname, router.query.id, user?.id]);

  const isPublicPage = ['/login', '/register'].includes(router.pathname);
  if (loading && !isPublicPage) return <AuthLoader />;

  const normalizedPath  = router.pathname;
  const isDynamicChat   = normalizedPath === '/chat/[id]';
  const isDynamicCourse = normalizedPath === '/courses/[id]';
  const shouldHideNavbar = hideNavbarPages.includes(normalizedPath) || isDynamicChat || isDynamicCourse;

  return (
    <div className="min-h-screen font-['Outfit',sans-serif]" style={{ backgroundColor: 'var(--bg-page)', color: 'var(--text-primary)' }}>
      <Toaster
        position="top-center"
        reverseOrder={false}
        gutter={8}
        toastOptions={{
          duration: 5000,
          style: { background: '#fff', color: '#1e293b', borderRadius: '20px', padding: '12px 20px', fontSize: '14px', fontWeight: '700', boxShadow: '0 10px 40px -10px rgba(0,0,0,0.15)' },
          success: { iconTheme: { primary: '#4f46e5', secondary: '#fff' } },
          error: { style: { background: '#1e293b', color: '#fff' }, iconTheme: { primary: '#ef4444', secondary: '#fff' } },
        }}
      />
      
      {isOffline && (
        <div className="bg-rose-500 text-white text-center py-2 text-sm font-black uppercase tracking-widest fixed top-0 left-0 right-0 z-[60] shadow-lg">
          Offline Mode
        </div>
      )}

      {deferredPrompt && (
        <div className="bg-primary-600 text-white text-center py-3 px-4 text-sm font-black sticky top-0 z-50 flex justify-center items-center gap-4 shadow-xl animate-fade-in-down">
          <span className="uppercase tracking-tight">Experience Campus Chat as an App</span>
          <button
            onClick={() => { deferredPrompt.prompt(); deferredPrompt.userChoice.then(res => res.outcome === 'accepted' && setDeferredPrompt(null)); }}
            className="bg-white text-primary-600 px-6 py-1.5 rounded-full font-black text-[10px] uppercase tracking-widest shadow-md hover:bg-slate-50 transition-all"
          >
            Install Now
          </button>
        </div>
      )}

      <main className={shouldHideNavbar ? 'relative h-[100dvh] overflow-hidden flex flex-col' : 'pb-[calc(env(safe-area-inset-bottom)+90px)] relative'}>
        <PageWrapper>
          <Component {...pageProps} />
        </PageWrapper>
      </main>

      {isAuthenticated && !shouldHideNavbar && <Navbar user={user} loading={loading} />}
      <CallInterface />
    </div>
  );
}

// ─── Root App (wraps everything in providers) ─────────────────────────────────
export default function MyApp({ Component, pageProps }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <CallProvider>
          <ThemeColorSync />
          <AppContent Component={Component} pageProps={pageProps} />
        </CallProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
