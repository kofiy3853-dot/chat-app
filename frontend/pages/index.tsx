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
      <header className="px-4 pt-8 pb-10 bg-primary-500 rounded-b-[30px] shadow-sm relative z-10 transition-colors">
        <div className="flex justify-between items-center mb-4">
          <button aria-label="Menu" className="w-9 h-9 flex flex-col items-center justify-center space-y-1 active:scale-95">
             <span className="block w-5 h-0.5 bg-white/90 rounded-full" />
             <span className="block w-4 h-0.5 bg-white/90 rounded-full" />
             <span className="block w-5 h-0.5 bg-white/90 rounded-full" />
          </button>
          <h1 className="text-base font-bold tracking-wide text-white">Inbox</h1>
          <button
            onClick={() => router.push('/profile')}
            aria-label="Profile"
            className="w-10 h-10 rounded-full overflow-hidden shadow-sm border-2 border-primary-400 active:scale-95"
          >
            {avatarUrl ? (
              <img src={avatarUrl} className="w-full h-full object-cover" alt="" />
            ) : (
              <span className="flex items-center justify-center w-full h-full bg-white/10 text-xs font-bold text-white tracking-widest">{getInitials(user?.name)}</span>
            )}
          </button>
        </div>

        {/* Stories Section slightly trimmed */}
        <SoftStories currentUser={user} />
      </header>

      {/* ─── Floating Search Bar ─── */}
      <div className="px-4 relative z-20 -mt-6 mb-4">
         <div className="flex items-center bg-white rounded-2xl px-4 py-3 border border-gray-100 shadow-sm transition-all focus-within:ring-2 focus-within:ring-primary-100">
           <MagnifyingGlassIcon className="w-5 h-5 text-slate-400 mr-3 flex-shrink-0" />
           <input
             type="text"
             placeholder="Search chats..."
             value={search}
             onChange={(e) => setSearch(e.target.value)}
             className="flex-1 bg-transparent border-none outline-none text-slate-700 placeholder-slate-400 font-medium text-sm"
           />
         </div>
      </div>

      {/* ─── Main Content Area ─── */}
      <main className="flex-1 overflow-y-auto no-scrollbar pb-32">
        <AnimatePresence mode="wait">
          {activeTab === 'messages' && (
            <motion.div
              key="messages"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="px-4"
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

      {/* ─── Clean Bottom Navigation ─── */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-xl mx-auto z-40 px-4 pb-4 pt-2 pointer-events-none">
        <div className="flex justify-around items-center bg-white rounded-full border border-gray-100 shadow-lg h-16 px-2 pointer-events-auto relative">
          
          <button 
            aria-label="Messages" 
            onClick={() => setActiveTab('messages')} 
            className="flex-1 flex flex-col items-center justify-center space-y-1"
          >
            <ChatBubbleOvalLeftEllipsisIcon className={`w-[22px] h-[22px] ${activeTab === 'messages' ? 'text-primary-600 stroke-2' : 'text-slate-400 stroke-2'}`} />
            {activeTab === 'messages' && <span className="w-1 h-1 rounded-full bg-primary-600"></span>}
          </button>

          {/* Central FAB - New Chat */}
          <div className="relative bottom-4">
             <button
               onClick={() => setActiveTab('contacts')}
               aria-label="New Chat"
               className="w-12 h-12 rounded-full flex items-center justify-center text-white shadow-md bg-primary-600 hover:bg-primary-500 active:scale-95 transition-all outline outline-4 outline-white"
               title="New Chat"
             >
               <PlusIcon className="w-6 h-6 stroke-[3px]" />
             </button>
          </div>

          <button 
            aria-label="Calls" 
            onClick={() => setActiveTab('calls')} 
            className="flex-1 flex flex-col items-center justify-center space-y-1"
          >
            <PhoneIcon className={`w-[22px] h-[22px] ${activeTab === 'calls' ? 'text-primary-600 stroke-2' : 'text-slate-400 stroke-2'}`} />
            {activeTab === 'calls' && <span className="w-1 h-1 rounded-full bg-primary-600"></span>}
          </button>
          
          <button 
            aria-label="Contacts" 
            onClick={() => setActiveTab('contacts')} 
            className="flex-1 flex flex-col items-center justify-center space-y-1"
          >
            <UserIcon className={`w-[22px] h-[22px] ${activeTab === 'contacts' ? 'text-primary-600 stroke-2' : 'text-slate-400 stroke-2'}`} />
            {activeTab === 'contacts' && <span className="w-1 h-1 rounded-full bg-primary-600"></span>}
          </button>
        </div>
      </nav>
    </div>
  );
};

export default MessagesPage;
