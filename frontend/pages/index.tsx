import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { getCurrentUser } from '../utils/helpers';
import { chatAPI } from '../services/api';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import SignalIcon from '@heroicons/react/24/outline/SignalIcon';
import ArrowPathIcon from '@heroicons/react/24/outline/ArrowPathIcon';

const SoftChatList = dynamic(() => import('../components/SoftChatList'), { ssr: false });
const SoftStories = dynamic(() => import('../components/SoftStories'), { ssr: false });
const Navbar = dynamic(() => import('../components/Navbar'), { ssr: false });

const MessagesPage: React.FC = () => {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const localUser = getCurrentUser();
    if (!localUser) {
      router.push('/login');
      return;
    }
    setUser(localUser);
    fetchData();
  }, [router]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const convRes = await chatAPI.getConversations();
      setConversations(convRes.data.conversations || []);
    } catch (err: any) {
      console.error('Fetch error:', err);
      // For diagnostic purposes in the emulator
      setError(err.message || 'Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return (
      <div className="h-[100dvh] flex flex-col items-center justify-center p-6 bg-slate-50 text-center">
        <div className="w-20 h-20 bg-red-100 rounded-3xl flex items-center justify-center mb-6">
          <SignalIcon className="w-10 h-10 text-red-600" />
        </div>
        <h1 className="text-xl font-black text-slate-900 mb-2">Connection Failed</h1>
        <p className="text-slate-500 text-sm mb-8 max-w-xs">
          We couldn't reach the Campus Chat server. Please ensure your backend is running on port 5000 and your network allows traffic to 10.0.2.2.
        </p>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-8 w-full max-w-xs text-left">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Diagnostic Detail</p>
          <p className="text-xs font-mono text-red-500 break-all">{error}</p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center space-x-2 bg-indigo-600 text-white px-8 py-3 rounded-2xl font-bold shadow-lg shadow-indigo-200 active:scale-95 transition-all"
        >
          <ArrowPathIcon className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          <span>{loading ? 'Retrying...' : 'Try Again'}</span>
        </button>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-white">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-slate-500 font-medium">Verifying authentication...</p>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] flex flex-col max-w-xl mx-auto relative overflow-hidden bg-white">
      <Head>
        <title>Messages | Campus Chat</title>
      </Head>

      <header className="bg-indigo-600 px-4 pt-12 pb-4 text-white">
        <h1 className="text-lg font-bold">Chats</h1>
      </header>

      <main className="flex-1 overflow-y-auto no-scrollbar pb-20">
        <div className="px-2 pt-2 pb-1 border-b border-gray-100">
          <SoftStories currentUser={user} />
        </div>
        <SoftChatList
          conversations={conversations}
          currentUser={user}
          loading={loading}
          onChatClick={(id) => router.push(`/chat/${id}`)}
        />
      </main>

      <Navbar />
    </div>
  );
};

export default MessagesPage;
