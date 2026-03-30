import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { 
  MagnifyingGlassIcon, 
  ChatBubbleOvalLeftEllipsisIcon, 
  PhoneIcon, 
  Cog8ToothIcon,
  PlusIcon 
} from '@heroicons/react/24/outline';
import { getCurrentUser } from '../utils/helpers';
import { chatAPI, userAPI } from '../services/api';
import SoftChatListItem from '../components/SoftChatListItem';
import SoftStories from '../components/SoftStories';
import SoftChatList from '../components/SoftChatList';

const MessagesPage: React.FC = () => {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [conversations, setConversations] = useState<any[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

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
        userAPI.searchUsers('') // Search all initially for stories
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

  return (
    <div className="min-h-screen bg-soft-bg flex flex-col max-w-xl mx-auto shadow-sm relative overflow-x-hidden">
      <Head>
        <title>Messages | Campus Chat</title>
      </Head>

      {/* Header */}
      <header className="bg-soft-gradient rounded-b-[24px] px-6 pt-10 pb-12 text-white relative shadow-lg shadow-indigo-500/10">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-black tracking-tight leading-none">Messages</h1>
          <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20 overflow-hidden shadow-sm">
            {user?.avatar ? (
              <img src={user.avatar} className="w-full h-full object-cover" alt="" />
            ) : (
              <span className="text-sm font-black uppercase">{user?.name?.charAt(0)}</span>
            )}
          </div>
        </div>

        {/* Search Bar - Positioned at overlap */}
        <div className="absolute -bottom-7 left-6 right-6 flex items-center bg-white rounded-2xl px-4 py-4 shadow-soft">
          <MagnifyingGlassIcon className="w-5 h-5 text-soft-text-secondary mr-3" />
          <input 
            type="text" 
            placeholder="Search friends..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-soft-text-primary placeholder-soft-text-secondary font-medium text-sm"
          />
        </div>
      </header>

      {/* Story List */}
      <div className="mt-12 px-6">
        <SoftStories stories={onlineUsers} />
      </div>

      {/* Chat List */}
      <div className="flex-1 px-4 mt-2 overflow-y-auto min-h-0 bg-white rounded-t-[24px] shadow-sm pb-24">
        <SoftChatList 
          conversations={filteredConversations} 
          currentUser={user} 
          onChatClick={handleChatClick} 
          loading={loading}
        />
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-xl mx-auto bg-white/90 backdrop-blur-xl border-t border-slate-50 flex justify-around items-center px-4 pt-4 pb-8 z-40">
        <button 
          aria-label="Messages"
          className="p-3 text-soft-primary bg-indigo-50 rounded-2xl shadow-sm"
        >
          <ChatBubbleOvalLeftEllipsisIcon className="w-6 h-6" />
        </button>
        <div className="relative -mt-16">
          <button 
            aria-label="New Message"
            className="w-16 h-16 rounded-full bg-soft-gradient flex items-center justify-center text-white shadow-xl shadow-indigo-500/30 active:scale-95 transition-transform"
          >
            <PlusIcon className="w-8 h-8 stroke-[3px]" />
          </button>
        </div>
        <button 
          aria-label="Calls"
          className="p-3 text-soft-text-secondary hover:text-soft-primary transition-colors"
        >
          <PhoneIcon className="w-6 h-6" />
        </button>
        <button 
          aria-label="Settings"
          className="p-3 text-soft-text-secondary hover:text-soft-primary transition-colors"
        >
          <Cog8ToothIcon className="w-6 h-6" />
        </button>
      </nav>
    </div>
  );
};

export default MessagesPage;
