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
    <div className="min-h-screen flex flex-col max-w-xl mx-auto relative overflow-x-hidden bg-app font-sans">
      <Head>
        <title>Messages | Campus Chat</title>
      </Head>

      {/* ─── Premium Blue Tray Header ─── */}
      <header className="px-5 pt-10 pb-8 bg-header-gradient rounded-b-[40px] shadow-2xl shadow-primary-500/20 relative z-20">
        <div className="flex justify-between items-center mb-6">
          <button aria-label="Menu" className="w-10 h-10 rounded-2xl bg-white/10 flex flex-col space-y-1.5 items-center justify-center transition-all active:scale-95">
             <span className="block w-5 h-0.5 bg-white/80 rounded-full" />
             <span className="block w-3.5 h-0.5 bg-white/80 rounded-full" />
          </button>
          <h1 className="text-sm font-black tracking-[0.25em] uppercase text-white/90">Messages</h1>
          <button
            onClick={() => router.push('/profile')}
            aria-label="Profile"
            className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md border border-white/20 overflow-hidden shadow-sm"
          >
            {avatarUrl ? (
              <img src={avatarUrl} className="w-full h-full object-cover" alt="" />
            ) : (
              <span className="text-xs font-black text-white">{getInitials(user?.name)}</span>
            )}
          </button>
        </div>

        {/* Integrated Search Bar inside Header */}
        <div className="mb-6">
           <div className="flex items-center bg-white/15 backdrop-blur-md rounded-[24px] px-5 py-3.5 border border-white/20 shadow-inner">
             <MagnifyingGlassIcon className="w-5 h-5 text-white/60 mr-3 flex-shrink-0" />
             <input
               type="text"
               placeholder="Search conversations..."
               value={search}
               onChange={(e) => setSearch(e.target.value)}
               className="flex-1 bg-transparent border-none outline-none text-white placeholder-white/50 font-bold text-[14px]"
             />
           </div>
        </div>

        {/* Stories Section inside the tray */}
        <SoftStories stories={onlineUsers} />
      </header>

      {/* ─── Main Content Area ─── */}
      <main className="flex-1 bg-white mt-[-20px] pt-10 rounded-t-[40px] overflow-y-auto no-scrollbar pb-32 shadow-inner">
        <AnimatePresence mode="wait">
          {activeTab === 'messages' && (
            <motion.div
              key="messages"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="px-2"
            >
              <SoftChatList
                conversations={filteredConversations}
                currentUser={user}
                onChatClick={handleChatClick}
                loading={loading}
              />
            </motion.div>
          )}
          
          {/* ... other tabs ... */}
        </AnimatePresence>
      </main>

      {/* ─── Floating Navigation Island ─── */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-xl mx-auto z-40 px-6 pb-6 pt-2 pointer-events-none">
        <div className="flex justify-around items-center bg-white/95 backdrop-blur-2xl rounded-[2.5rem] border border-slate-50 shadow-2xl shadow-primary-900/10 h-20 px-4 pointer-events-auto">
          <button aria-label="Messages" onClick={() => setActiveTab('messages')} className="flex-1 flex justify-center">
            <ChatBubbleOvalLeftEllipsisIcon className={`w-6 h-6 stroke-2 ${activeTab === 'messages' ? 'text-primary-500' : 'text-slate-300'}`} />
          </button>

          <div className="relative bottom-4">
             <button
               aria-label="New Message"
               className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-xl bg-primary-500 shadow-primary-500/40 active:scale-95 transition-all border-4 border-white"
             >
               <PlusIcon className="w-8 h-8 stroke-[3.5px]" />
             </button>
          </div>

          <button aria-label="Calls" onClick={() => setActiveTab('calls')} className="flex-1 flex justify-center">
            <PhoneIcon className={`w-6 h-6 stroke-2 ${activeTab === 'calls' ? 'text-primary-500' : 'text-slate-300'}`} />
          </button>
          
          <button aria-label="Contacts" onClick={() => setActiveTab('contacts')} className="flex-1 flex justify-center">
            <UserIcon className={`w-6 h-6 stroke-2 ${activeTab === 'contacts' ? 'text-primary-500' : 'text-slate-300'}`} />
          </button>
        </div>
      </nav>
    </div>
  );
};

export default MessagesPage;
