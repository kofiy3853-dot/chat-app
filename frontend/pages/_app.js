import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Navbar from '../components/Navbar';
import { initSocket } from '../services/socket';
import { CallProvider } from '../context/CallContext';
import CallInterface from '../components/CallInterface';
import '../styles/globals.css';

// Pages that DON'T need you to be logged in
const publicPages = ['/login', '/register'];

// Pages that should NEVER show the bottom navbar (like Chat screen)
const hideNavbarPages = ['/login', '/register', '/chat/[id]', '/courses/[id]'];

function MyApp({ Component, pageProps }) {
  const router = useRouter();
  // Must start as false for SSR/hydration compatibility (localStorage not available server-side)
  const [authorized, setAuthorized] = useState(false);
  const [checked, setChecked] = useState(false);

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
      setChecked(true);
    };

    authCheck(router.asPath);

    router.events.on('routeChangeComplete', authCheck);
    return () => router.events.off('routeChangeComplete', authCheck);
  }, [router]);

  const isPublic = publicPages.includes(router.pathname);
  const shouldHideNavbar = hideNavbarPages.includes(router.pathname);

  // Only block on initial unchecked state — avoids infinite spinner if token exists
  if (!checked && !isPublic) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <CallProvider>
      <div className="min-h-screen bg-gray-50">
        <main className={shouldHideNavbar ? '' : 'pb-20'}>
          <Component {...pageProps} />
        </main>
        {authorized && !shouldHideNavbar && <Navbar />}
        <CallInterface />
      </div>
    </CallProvider>
  );
}

export default MyApp;
