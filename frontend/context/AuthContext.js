import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { initSocket, disconnectSocket } from '../services/socket';

// ─── Route Configuration ──────────────────────────────────────────────────────
// "/" is intentionally PUBLIC — it's the landing/redirect target, not a protected dashboard.
// Protected routes are matched by prefix so /chat/123 is automatically covered by '/chat'.
export const ROUTE_CONFIG = {
  public: ['/', '/login', '/register'],
  protected: ['/chat', '/courses', '/account', '/admin', '/nana', '/events', '/activity', '/status', '/announcements', '/anonymous', '/discover'],
};

// Role → allowed route prefixes. Routes not listed default to allowed.
export const ROLE_ACCESS = {
  STUDENT:    { denied: ['/admin'] },
  LECTURER: { denied: ['/admin'] },
  ADMIN:      { denied: ['/nana'] },
  NANA:       { denied: ['/admin', '/courses', '/events', '/account'] },
};

// ─── Context ──────────────────────────────────────────────────────────────────
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]           = useState(null);
  const [loading, setLoading]     = useState(true); // TRUE until first hydration completes

  // ── Hydrate on mount (client-side only to avoid SSR mismatch) ────────────
  useEffect(() => {
    try {
      const token   = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');

      if (token && userStr) {
        const parsed = JSON.parse(userStr);
        setUser(parsed);
        // Re-establish socket with the stored token
        initSocket();
      }
    } catch (e) {
      // Corrupt storage — clear it
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    } finally {
      setLoading(false); // Auth check complete — guards may now redirect
    }
  }, []);

  // ── login() — call after successful API response ─────────────────────────
  const login = useCallback((userData, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    initSocket();
  }, []);

  // ── logout() — clears state and storage ─────────────────────────────────
  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    disconnectSocket();
  }, []);

  // ── Sync user profile updates (e.g. after updateProfile API call) ────────
  const updateUser = useCallback((updatedFields) => {
    setUser(prev => {
      if (!prev) return prev;
      const merged = { ...prev, ...updatedFields };
      localStorage.setItem('user', JSON.stringify(merged));
      return merged;
    });
  }, []);

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
