import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { initSocket, disconnectSocket } from '../services/socket';
import { saveAuthToken } from '../utils/indexedDB';

// ─── Route Configuration ──────────────────────────────────────────────────────
// "/" is the MAIN DASHBOARD — strictly protected.
// Public routes are entry points only (Login/Register).
export const ROUTE_CONFIG = {
  public: ['/login', '/register'],
  protected: ['/', '/chat', '/courses', '/account', '/admin', '/nana', '/events', '/activity', '/status', '/announcements', '/anonymous', '/discover'],
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
        // Sync to IndexedDB for SW
        saveAuthToken(token).catch(() => {});
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
    // Save to IndexedDB for Background Sync/Service Worker
    saveAuthToken(token).catch(err => console.warn('[IDB] Failed to save token:', err));
    setUser(userData);
    initSocket();
  }, []);

  // ── logout() — clears state and storage ─────────────────────────────────
  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    // Clear from IndexedDB (optional but good practice)
    saveAuthToken(null).catch(() => {});
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
