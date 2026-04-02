import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { authAPI } from '../services/api';
import { initSocket } from '../services/socket';
import { initOneSignal } from '../services/oneSignal';
import { AcademicCapIcon } from '@heroicons/react/24/outline';

export default function Login() {
  const router = useRouter();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await authAPI.login(formData);
      const { token, user } = response.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      initSocket();
      initOneSignal(user);
      router.push('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Login | Campus Chat</title>
      </Head>

      <div className="min-h-screen flex flex-col items-center justify-center px-5" style={{ backgroundColor: '#6B73FF' }}>

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-3xl mb-4">
            <AcademicCapIcon className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Campus Chat</h1>
          <p className="text-white/60 text-sm font-medium mt-1">Sign in to your account</p>
        </div>

        {/* Form Card */}
        <div className="w-full max-w-sm bg-white rounded-3xl p-8 shadow-2xl shadow-black/20">
          {error && (
            <div className="mb-5 p-3.5 bg-red-50 text-red-600 rounded-2xl text-sm font-medium border border-red-100">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all"
                placeholder="your@email.edu"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-2xl text-sm font-black text-white tracking-wide disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: '#6B73FF' }}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-400 mt-6 font-medium">
            Don't have an account?{' '}
            <Link href="/register" className="font-black" style={{ color: '#6B73FF' }}>
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}
