import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { 
  MagnifyingGlassIcon, 
  ChatBubbleOvalLeftEllipsisIcon, 
  PhoneIcon, 
  UserIcon,
  PlusIcon 
} from '@heroicons/react/24/outline';
import { getCurrentUser } from '../utils/helpers';
import { chatAPI, userAPI } from '../services/api';
import SoftChatList from '../components/SoftChatList';
import SoftStories from '../components/SoftStories';
import { getFullFileUrl, getInitials } from '../utils/helpers';
import { motion, AnimatePresence } from 'framer-motion';

const MessagesPage: React.FC = () => {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [conversations, setConversations] = useState<any[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'messages' | 'calls' | 'contacts'>('messages');

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  }, []);

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
    try {
      const [convRes, userRes] = await Promise.all([
        chatAPI.getConversations(),
        userAPI.searchUsers('')
      ]);
      setConversations(convRes.data.conversations || []);
      setOnlineUsers(userRes.data.users?.filter((u: any) => u.isOnline) || []);
    } catch (err) {
      console.error('Fetch data error:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredConversations = useMemo(() => {
    return conversations.filter(conv => {
      const name = (conv.name || conv.participants?.find((p: any) => p.userId !== user?.id)?.user?.name || '').toLowerCase();
      const lastMsg = (conv.lastMessage?.content || '').toLowerCase();
      return name.includes(search.toLowerCase()) || lastMsg.includes(search.toLowerCase());
    });
  }, [conversations, search, user]);

  const handleChatClick = useCallback((id: string) => {
    router.push(`/chat/${id}`);
  }, [router]);

  if (!user) return null;

  const avatarUrl = getFullFileUrl(user?.avatar);

  return (
    <div className="min-h-screen flex flex-col max-w-xl mx-auto relative overflow-x-hidden bg-app">
      <Head>
        <title>Messages | Campus Chat</title>
      </Head>

      {/* ─── Premium Header ─── */}
      <header className="relative px-6 pt-12 pb-24 text-white overflow-hidden">
        {/* Animated Orbs for Depth */}
        <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-white/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-[-20%] left-[-10%] w-48 h-48 bg-primary-400/20 rounded-full blur-2xl" />
        
        {/* Header Background */}
        <div className="absolute inset-0 bg-header-gradient z-[-1]" />

        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-between items-center mb-6 relative z-10"
        >
          <div className="flex items-center space-x-3">
             <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-sm">
                <ChatBubbleOvalLeftEllipsisIcon className="w-5 h-5 text-white" />
             </div>
             <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60 leading-none mb-1">{greeting}</p>
                <h1 className="text-lg font-black tracking-tight text-white">{user?.name?.split(' ')[0] || 'User'}</h1>
             </div>
          </div>
          
          <button
            onClick={() => router.push('/profile')}
            aria-label="My profile"
            className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 overflow-hidden flex items-center justify-center shadow-lg transition-transform active:scale-90"
          >
            {avatarUrl ? (
              <img src={avatarUrl} className="w-full h-full object-cover" alt="" />
            ) : (
              <span className="text-sm font-black text-white">{getInitials(user?.name)}</span>
            )}
          </button>
        </motion.div>

        {/* Stories Section */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="relative z-10"
        >
          <SoftStories stories={onlineUsers} />
        </motion.div>
      </header>

      {/* ─── Search bar (Glassmorphic overlap) ─── */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="px-6 -mt-8 z-20 relative"
      >
        <div className="flex items-center bg-white/90 backdrop-blur-2xl rounded-3xl px-5 py-4 shadow-xl shadow-primary-500/10 border border-white/50">
          <MagnifyingGlassIcon className="w-5 h-5 text-soft-text-secondary mr-4 flex-shrink-0" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-soft-text-primary placeholder-soft-text-secondary font-bold text-sm"
          />
          <div className="w-8 h-8 rounded-xl bg-primary-50 flex items-center justify-center">
             <PlusIcon className="w-4 h-4 text-soft-primary" />
          </div>
        </div>
      </motion.div>

      {/* ─── Main Content Area ─── */}
      <main className="flex-1 mt-6 px-0 overflow-y-auto no-scrollbar pb-32">
        <AnimatePresence mode="wait">
          {activeTab === 'messages' && (
            <motion.div
              key="messages"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2 }}
            >
              <SoftChatList
                conversations={filteredConversations}
                currentUser={user}
                onChatClick={handleChatClick}
                loading={loading}
              />
            </motion.div>
          )}
          
          {activeTab === 'calls' && (
            <motion.div
              key="calls"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="flex flex-col items-center justify-center pt-20 px-10 text-center"
            >
              <div className="w-20 h-20 bg-slate-100 rounded-[2rem] flex items-center justify-center mb-6">
                <PhoneIcon className="w-10 h-10 text-slate-300" />
              </div>
              <h3 className="text-xl font-black text-slate-800 tracking-tight">Recent Calls</h3>
              <p className="text-sm text-slate-400 font-bold mt-2">No voice or video calls recorded in your history yet.</p>
            </motion.div>
          )}

          {activeTab === 'contacts' && (
            <motion.div
              key="contacts"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="flex flex-col items-center justify-center pt-20 px-10 text-center"
            >
              <div className="w-20 h-20 bg-slate-100 rounded-[2rem] flex items-center justify-center mb-6">
                <UserIcon className="w-10 h-10 text-slate-300" />
              </div>
              <h3 className="text-xl font-black text-slate-800 tracking-tight">Your Contacts</h3>
              <p className="text-sm text-slate-400 font-bold mt-2">Sync your phone contacts to find friends on Campus Chat.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* ─── Bottom Navigation ─── */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-xl mx-auto z-40 px-6 pb-6 pt-2 pointer-events-none">
        <div className="flex justify-around items-center bg-white/90 backdrop-blur-2xl rounded-[2.5rem] border border-white/50 shadow-2xl shadow-primary-900/10 h-20 px-6 pointer-events-auto">
          {/* Tab buttons */}
          <button 
            aria-label="Messages"
            onClick={() => setActiveTab('messages')} 
            className="flex flex-col items-center"
          >
            <div className={`p-3 rounded-2xl transition-all duration-300 ${activeTab === 'messages' ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/30' : 'text-slate-400'}`}>
              <ChatBubbleOvalLeftEllipsisIcon className="w-6 h-6 stroke-2" />
            </div>
          </button>

          {/* New Message FAB in center */}
          <button
            aria-label="New Message"
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-xl bg-fab-gradient active:scale-90 transition-transform transform -mt-10 border-4 border-white"
          >
            <PlusIcon className="w-8 h-8 stroke-[3px]" />
          </button>

          <button 
            aria-label="Calls"
            onClick={() => setActiveTab('calls')} 
            className="flex flex-col items-center"
          >
            <div className={`p-3 rounded-2xl transition-all duration-300 ${activeTab === 'calls' ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/30' : 'text-slate-400'}`}>
              <PhoneIcon className="w-6 h-6 stroke-2" />
            </div>
          </button>

          <button 
            aria-label="Contacts"
            onClick={() => setActiveTab('contacts')} 
            className="flex flex-col items-center"
          >
            <div className={`p-3 rounded-2xl transition-all duration-300 ${activeTab === 'contacts' ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/30' : 'text-slate-400'}`}>
              <UserIcon className="w-6 h-6 stroke-2" />
            </div>
          </button>
        </div>
      </nav>
    </div>
  );
};

export default MessagesPage;
