import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Navbar from '../components/Navbar';
import { initSocket, getSocket } from '../services/socket';
import { SplashScreen } from '@capacitor/splash-screen';
import { CallProvider } from '../context/CallContext';
import { ThemeProvider } from '../context/ThemeContext';
import { initOneSignal } from '../services/oneSignal';
import dynamic from 'next/dynamic';
import { Toaster, toast } from 'react-hot-toast';
import useAuthRedirect from '../hooks/useAuthRedirect';
import '../styles/globals.css';

const CallInterface = dynamic(() => import('../components/CallInterface'), { ssr: false });

const publicPages = ['/login', '/register'];
const hideNavbarPages = ['/login', '/register', '/chat/[id]', '/courses/[id]', '/events/create', '/anonymous/create'];

export default function MyApp({ Component, pageProps }) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  // --- Hydrate User Context ---
  const [user, setUser] = useState(null);

  useEffect(() => {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr && userStr !== 'undefined' && userStr !== 'null') {
        const parsed = JSON.parse(userStr);
        setUser(parsed);
      }
    } catch (e) {
      console.warn("USER HYDRATION FAILED:", e);
      localStorage.removeItem('user'); // Clear potentially corrupt data
    }
  }, []);

  const currentUser = user;

  useEffect(() => {
    // 1. Splash Screen Management
    const hideSplash = async () => {
      try {
        await SplashScreen.hide();
      } catch (e) {
        console.warn("NATIVE SPLASH HIDE FAIL:", e);
      }
      
      // Always remove the initial-loader element regardless of native splash status
      const loader = document.getElementById('initial-loader');
      if (loader) {
        loader.style.opacity = '0';
        loader.style.visibility = 'hidden';
        setTimeout(() => {
          loader.style.display = 'none';
          loader.remove();
        }, 500);
      }
    };

    // Hide splash screen after 2 seconds regardless of data status
    const timer = setTimeout(hideSplash, 2000);

    // 2. Health Ping
    const ping = () => {
      const url = process.env.NEXT_PUBLIC_API_URL || 'http://10.0.2.2:5000/api';
      fetch(url.replace(/\/api$/, '') + '/health').catch(() => {});
    };
    ping();

    // 3. Initial Auth Hydration
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    if (token && userStr && userStr !== 'undefined') {
       setAuthorized(true);
       initSocket();
    }
    
    // Safety timeout to ensure isReady is always set
    const timerReady = setTimeout(() => {
       setIsReady(true);
    }, 100);

    return () => { clearTimeout(timer); clearTimeout(timerReady); };
  }, []);

  // 4. Global Notification & Socket Events
  useEffect(() => {
    if (!authorized) return;
    const socket = getSocket();
    if (!socket) return;

    const handleNewMessage = (data) => {
      if (router.pathname === '/chat/[id]' && String(router.query.id) === String(data.conversationId)) return;
      
      const msg = data.message;
      if (msg.senderId === user?.id) return;

      const senderName = msg.sender?.name || data.senderName || 'Campus Student';
      const content = msg.content || 'Sent an attachment';
      
      toast.custom((t) => (
        <div className="max-w-sm w-full bg-white shadow-2xl rounded-2xl p-4 border border-indigo-100 flex cursor-pointer transition-all mb-4" onClick={() => { router.push(`/chat/${data.conversationId}`); toast.dismiss(t.id); }}>
          <div className="flex-1">
            <p className="text-sm font-bold text-gray-900">{senderName}</p>
            <p className="text-xs text-gray-500 truncate">{content}</p>
          </div>
        </div>
      ), { duration: 4000, position: 'top-center' });
    };

    socket.on('new-message', handleNewMessage);
    return () => socket.off('new-message');
  }, [authorized, router.pathname, router.query.id, user?.id]);

  useAuthRedirect(currentUser, isReady);

  if (!isReady) return null;

  const isNanaTerminal = router.pathname.startsWith('/nana');
  const shouldHideNavbar = hideNavbarPages.includes(router.pathname) || (user?.role === 'NANA' && isNanaTerminal);

  return (
    <ThemeProvider>
    <CallProvider>
      <div className="min-h-screen font-sans bg-gray-50">
        <Toaster position="top-center" />
        <main className={shouldHideNavbar ? '' : 'pb-20'}>
          <Component {...pageProps} key={router.asPath} />
        </main>
        {authorized && !shouldHideNavbar && <Navbar />}
        <CallInterface />
      </div>
    </CallProvider>
    </ThemeProvider>
  );
}
