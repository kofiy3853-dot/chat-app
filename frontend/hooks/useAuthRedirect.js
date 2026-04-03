import { useEffect } from 'react';
import { useRouter } from 'next/router';

/**
 * useAuthRedirect - Centralized Routing Hook
 * Handles all authentication and role-based redirects in one place.
 * 
 * @param {Object} user - The current logged-in user object from state or localStorage
 * @param {boolean} isReady - Whether the initial auth check has completed
 */
export default function useAuthRedirect(user, isReady) {
  const router = useRouter();

  useEffect(() => {
    if (!isReady || !router.isReady) return;

    const path = router.pathname;
    const publicPages = ['/login', '/register'];
    const isPublicPage = publicPages.includes(path);
    const isAuthenticated = !!user;

    // 1. UNAUTHENTICATED USERS: Must be on a public page
    if (!isAuthenticated) {
      if (!isPublicPage) {
        console.warn(`[AUTH] Guard: Unauthenticated user on ${path}. Redirecting to /login.`);
        router.replace('/login');
      }
      return;
    }

    // 2. AUTHENTICATED USERS: Must NOT be on a public page
    if (isPublicPage) {
      const target = user.role === 'NANA' ? '/nana' : '/';
      console.log(`[AUTH] Guard: Authenticated user on ${path}. Redirecting to ${target}.`);
      router.replace(target);
      return;
    }

    // 3. ROLE-BASED ACCESS CONTROL (RBAC)
    const role = user.role;

    // A. Nana Role: Only allowed on /nana
    if (role === 'NANA') {
      if (!path.startsWith('/nana')) {
        router.replace('/nana');
      }
    }

    // B. Student/Instructor Role: Not allowed on /admin or nana-only area
    if ((role === 'STUDENT' || role === 'INSTRUCTOR')) {
       if (path.startsWith('/admin')) {
         router.replace('/');
       }
    }

    // 4. PREFETCHING FOR INSTANT NAVIGATION
    if (!isPublicPage) {
      // Prefetch common routes for this role
      if (role === 'NANA') {
        router.prefetch('/nana');
      } else {
        router.prefetch('/');
        router.prefetch('/account');
        router.prefetch('/courses');
      }
    }

  }, [user, isReady, router.pathname, router.isReady]);
}
