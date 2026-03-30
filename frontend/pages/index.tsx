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
      const convRes = await chatAPI.getConversations();
      setConversations(convRes.data.conversations || []);
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

      {/* ─── Compact Header ─── */}
      <header className="px-4 pt-10 pb-4 bg-primary-500 shadow-sm relative z-10 transition-colors">
        <div className="flex justify-between items-center relative">
          <button aria-label="Menu" className="w-10 h-10 flex flex-col items-center justify-center space-y-1.5 active:scale-95 transition-all">
             <span className="block w-6 h-0.5 bg-white rounded-full" />
             <span className="block w-6 h-0.5 bg-white rounded-full" />
             <span className="block w-6 h-0.5 bg-white rounded-full" />
          </button>
          
          <h1 className="text-xl font-bold tracking-wide text-white absolute left-1/2 -translate-x-1/2">Inbox</h1>
          
          <button
            onClick={() => router.push('/profile')}
            aria-label="Profile"
            className="w-10 h-10 rounded-full overflow-hidden shadow-sm border-2 border-primary-200 active:scale-95 transition-all"
          >
            {avatarUrl ? (
              <img src={avatarUrl} className="w-full h-full object-cover" alt="" />
            ) : (
              <span className="flex items-center justify-center w-full h-full bg-white/20 text-xs font-bold text-white tracking-widest">{getInitials(user?.name)}</span>
            )}
          </button>
        </div>
      </header>

      {/* ─── Search Bar ─── */}
      <div className="px-4 pt-4 pb-2 bg-white relative z-0">
         <div className="flex items-center bg-gray-100 rounded-full px-4 py-3 border border-transparent transition-all focus-within:ring-2 focus-within:ring-primary-100 focus-within:bg-white focus-within:border-primary-300">
           <MagnifyingGlassIcon className="w-5 h-5 text-gray-500 mr-3 flex-shrink-0" />
           <input
             type="text"
             placeholder="Search chats..."
             value={search}
             onChange={(e) => setSearch(e.target.value)}
             className="flex-1 bg-transparent border-none outline-none text-gray-900 placeholder-gray-500 font-medium text-sm"
           />
         </div>
      </div>

      {/* ─── Stories Section ─── */}
      <div className="bg-white px-2 pt-2 pb-4">
        <SoftStories currentUser={user} />
      </div>

      {/* ─── Main Content Area ─── */}
      <main className="flex-1 overflow-y-auto no-scrollbar pb-32 bg-white">
        <AnimatePresence mode="wait">
          {activeTab === 'messages' && (
            <motion.div
              key="messages"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="flex flex-col"
            >
              <SoftChatList
                conversations={filteredConversations}
                currentUser={user}
                onChatClick={handleChatClick}
                loading={loading}
                onStartChat={() => setActiveTab('contacts')}
              />
            </motion.div>
          )}
          
          {/* ... other tabs ... */}
        </AnimatePresence>
      </main>

    </div>
  );
};

export default MessagesPage;
