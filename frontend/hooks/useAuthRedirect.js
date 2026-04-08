import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth, ROUTE_CONFIG, ROLE_ACCESS } from '../context/AuthContext';

/**
 * useAuthRedirect — Production-grade, flicker-free auth guard.
 *
 * Rules:
 *  1. While loading  → do nothing (no redirect, no flicker)
 *  2. Unauthenticated + protected route  → /login
 *  3. Authenticated + login/register  → home (role-based)
 *  4. Authenticated + role-denied route  → home
 */
export default function useAuthRedirect() {
  const router = useRouter();
  const { user, loading, isAuthenticated } = useAuth();

  useEffect(() => {
    // ── GUARD 0: Wait for both auth AND router to be ready ──────────────────
    if (loading || !router.isReady) return;

    const path = router.pathname;

    const isPublicRoute    = ROUTE_CONFIG.public.includes(path);
    const isProtectedRoute = ROUTE_CONFIG.protected.some(p => path === p || path.startsWith(p + '/'));

    // ── GUARD 1: Unauthenticated + protected route ───────────────────────────
    if (!isAuthenticated && isProtectedRoute) {
      router.replace('/login');
      return;
    }

    // ── GUARD 2: Authenticated + auth pages (login/register) ────────────────
    if (isAuthenticated && (path === '/login' || path === '/register')) {
      const homeByRole = { NANA: '/nana', ADMIN: '/admin' };
      const roleKey = user?.role?.toUpperCase();
      const target = homeByRole[roleKey] || '/';
      if (path !== target) {
        router.replace(target);
      }
      return;
    }

    // ── GUARD 3: Role-based access control (RBAC) ───────────────────────────
    if (isAuthenticated && user?.role) {
      const roleKey = user.role.toUpperCase();
      const denied = ROLE_ACCESS[roleKey]?.denied || ROLE_ACCESS[user.role]?.denied || [];
      const isDenied = denied.some(d => path === d || path.startsWith(d + '/'));
      if (isDenied) {
        const homeByRole = { NANA: '/nana', ADMIN: '/admin' };
        const target = homeByRole[roleKey] || '/';
        if (path !== target) {
          router.replace(target);
        }
        return;
      }
    }

    // ── GUARD 4: Prefetch common routes for snappy navigation ───────────────
    if (isAuthenticated && !isPublicRoute) {
      if (user?.role === 'NANA') {
        router.prefetch('/nana');
      } else {
        router.prefetch('/');
        router.prefetch('/courses');
        router.prefetch('/account');
      }
    }

  }, [loading, isAuthenticated, user, router.pathname, router.isReady]);
}
