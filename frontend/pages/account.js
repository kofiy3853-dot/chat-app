import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import ProfileCard from '../components/ProfileCard';
import { authAPI } from '../services/api';
import { disconnectSocket } from '../services/socket';
import { 
  ArrowRightOnRectangleIcon,
  KeyIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';

export default function Account() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const response = await authAPI.getMe();
      setUser(response.data.user);
    } catch (error) {
      localStorage.removeItem('token');
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    disconnectSocket();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  const handleUpdateProfile = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Account | Campus Chat</title>
      </Head>
      
      <div className="max-w-lg mx-auto p-4 space-y-6 lg:pt-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-2 px-2">
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Account</h1>
        </div>

        {/* Profile Card */}
        <ProfileCard user={user} onUpdate={handleUpdateProfile} />

        {/* Settings */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-50 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">Preferences</h2>
            <ShieldCheckIcon className="w-5 h-5 text-blue-500" />
          </div>
          
          <div className="divide-y divide-gray-50">
            <button className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-all group">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                  <KeyIcon className="w-5 h-5" />
                </div>
                <span className="text-gray-700 font-bold text-sm">Update Password</span>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-gray-300">
                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
            </button>
            
            <button className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-all group">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                  <ShieldCheckIcon className="w-5 h-5" />
                </div>
                <span className="text-gray-700 font-bold text-sm">Privacy Controls</span>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-gray-300">
                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full bg-red-50 text-red-600 py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all shadow-sm active:scale-95 flex items-center justify-center space-x-3 group"
        >
          <ArrowRightOnRectangleIcon className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          <span>Sign Out of session</span>
        </button>

        {/* App Info */}
        <div className="text-center py-10">
          <p className="text-[10px] text-gray-300 font-bold uppercase tracking-tighter">Campus Chat Professional v1.2.4</p>
          <p className="text-[10px] text-gray-200 mt-1">Managed secure communication for campus education.</p>
        </div>
      </div>
    </>
  );
}

