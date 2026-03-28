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

  // ✅ Synchronous check: read localStorage on first render, no spinner flash for logged-in users
  const [authorized, setAuthorized] = useState(() => {
    if (typeof window === 'undefined') return false;
    const token = localStorage.getItem('token');
    const path = window.location.pathname;
    // Allow if they have a token, or are on a public page
    return !!token || publicPages.includes(path);
  });

  useEffect(() => {
    // Initialize socket immediately if we have a token
    const token = localStorage.getItem('token');
    if (token) initSocket();

    // Auth check (also handles expiry/route changes)
    const authCheck = (url) => {
      const path = url.split('?')[0];
      const currentToken = localStorage.getItem('token');

      if (!currentToken && !publicPages.includes(path)) {
        setAuthorized(false);
        router.push('/login');
      } else {
        setAuthorized(true);
        if (currentToken) initSocket();
      }
    };

    // Validate current path (handles expired tokens)
    authCheck(router.asPath);

    // Re-check on every navigation
    router.events.on('routeChangeComplete', authCheck);
    return () => router.events.off('routeChangeComplete', authCheck);
  }, [router]);

  const isPublic = publicPages.includes(router.pathname);
  const shouldHideNavbar = hideNavbarPages.includes(router.pathname);

  // Only block render if we KNOW they're unauthorized (authorized=false) and not on a public page
  // If authorized=true from sync check, render immediately — no spinner
  if (!authorized && !isPublic) {
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
