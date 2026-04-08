import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { authAPI, pushAPI, warmupServer } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { requestFirebaseNotificationPermission } from '../config/firebase';
import { AcademicCapIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function Login() {
  const router = useRouter();
  const { login } = useAuth();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [serverStatus, setServerStatus] = useState(''); // 'waking' | ''

  // Silently warm up the backend as soon as login page loads.
  // If Render is asleep, this gives it a head-start before the user hits Submit.
  useEffect(() => {
    warmupServer();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setServerStatus('');

    const attemptLogin = async () => authAPI.login(formData);

    try {
      let response;
      try {
        response = await attemptLogin();
      } catch (firstErr) {
        // If it's a timeout, the warmup should have woken the server by now — retry once
        const isTimeout = firstErr.code === 'ECONNABORTED' || firstErr.message?.includes('timeout');
        if (isTimeout) {
          setServerStatus('waking');
          setError('');
          response = await attemptLogin(); // Retry — server should be up now
          setServerStatus('');
        } else {
          throw firstErr; // Not a timeout, re-throw normally
        }
      }
      const { token, user } = response.data;

      // login() sets user state in AuthContext + writes localStorage + inits socket.
      // DO NOT call router.replace() here — React state is async.
      // useAuthRedirect in _app.js watches user state and will navigate
      // automatically once React commits the new user value.
      login(user, token);
      toast.success('Signed in successfully!');

      // Immediate redirect based on role
      const homeByRole = { NANA: '/nana', ADMIN: '/admin' };
      const destination = homeByRole[user.role?.toUpperCase()] || '/';
      router.replace(destination);

      // Initialize FCM in background — completely non-blocking
      requestFirebaseNotificationPermission()
        .then(fcmToken => {
          if (fcmToken) pushAPI.updateFcmToken(fcmToken).catch(() => {});
        })
        .catch(() => {});

    } catch (err) {
      console.error("LOGIN FRONTEND ERROR:", err.message);
      const isTimeout = err.code === 'ECONNABORTED' || err.message?.includes('timeout');
      if (isTimeout) {
        setError('The server took too long to respond. Please wait a moment and try again.');
      } else {
        setError(err.response?.data?.message || err.response?.data?.error || 'Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
      setServerStatus('');
    }
  };

  return (
    <>
      <Head>
        <title>Login | Campus Chat</title>
      </Head>

      <div className="h-full w-full overflow-y-auto bg-gray-50 px-4 flex flex-col py-8">
        <div className="max-w-md w-full mx-auto my-auto shrink-0">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-2xl mb-4 shadow-lg shadow-primary-200">
              <AcademicCapIcon className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Campus Chat</h1>
            <p className="text-gray-500 mt-2">Sign in to continue</p>
          </div>

          {/* Login Form */}
          <div className="bg-white rounded-2xl shadow-lg p-8">
            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                {error}
              </div>
            )}

            {serverStatus === 'waking' && (
              <div className="mb-4 p-3 bg-amber-50 text-amber-700 rounded-lg text-sm flex items-center gap-2">
                <svg className="animate-spin h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                Server is waking up... Retrying automatically.
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="your@email.edu"
                  required
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="••••••••"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary-600 text-white py-3 rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-primary-50"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-500">
                Don't have an account?{' '}
                <Link href="/register" className="text-primary-600 hover:text-primary-700 font-medium hover:underline">
                  Sign up
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
