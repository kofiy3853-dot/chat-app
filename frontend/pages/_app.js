import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Navbar from '../components/Navbar';
import { initSocket } from '../services/socket';
import '../styles/globals.css';

// Pages that DON'T need you to be logged in
const publicPages = ['/login', '/register'];

// Pages that should NEVER show the bottom navbar (like Chat screen)
const hideNavbarPages = ['/login', '/register', '/chat/[id]', '/courses/[id]'];

function MyApp({ Component, pageProps }) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    // 1. Initial auth check
    const authCheck = (url) => {
      const path = url.split('?')[0];
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

      if (!token && !publicPages.includes(path)) {
        setAuthorized(false);
        router.push('/login');
      } else {
        setAuthorized(true);
        // Initialize socket if authorized
        if (token) initSocket();
      }
    };

    // Run check on mount
    authCheck(router.asPath);

    // 2. Continuous check on route changes
    router.events.on('routeChangeComplete', authCheck);

    return () => {
      router.events.off('routeChangeComplete', authCheck);
    };
  }, [router]);

  // Determine if we should hide the layout components
  const isPublic = publicPages.includes(router.pathname);
  const shouldHideNavbar = hideNavbarPages.includes(router.pathname);

  // If we're not on a public page and not yet confirmed as authorized, 
  // we show a loading spinner to prevent UI flashes
  if (!authorized && !isPublic) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className={shouldHideNavbar ? '' : 'pb-20'}>
        <Component {...pageProps} />
      </main>
      {authorized && !shouldHideNavbar && <Navbar />}
    </div>
  );
}

export default MyApp;
