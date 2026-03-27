import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { initSocket } from '../services/socket';
import Navbar from '../components/Navbar';
import '../styles/globals.css';

// Pages that should not show the navbar
const noNavbarPages = ['/login', '/register', '/chat/[id]', '/courses/[id]'];

function MyApp({ Component, pageProps }) {
  const router = useRouter();
  
  // Check if current page is in the no navbar list
  const hideNavbar = noNavbarPages.includes(router.pathname);

  useEffect(() => {
    // Initialize socket once on app load if token exists
    // Don't disconnect on page transitions — reuse the same connection
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (token) {
      initSocket();
    }
  }, []); // Empty deps = run once only

  return (
    <div className="min-h-screen bg-gray-50">
      <main className={hideNavbar ? '' : 'pb-20'}>
        <Component {...pageProps} />
      </main>
      {!hideNavbar && <Navbar />}
    </div>
  );
}

export default MyApp;
