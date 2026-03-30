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
import SoftChatListItem from '../components/SoftChatListItem';
import SoftStories from '../components/SoftStories';
import SoftChatList from '../components/SoftChatList';
import { getFullFileUrl, getInitials } from '../utils/helpers';

const MessagesPage: React.FC = () => {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [conversations, setConversations] = useState<any[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'messages' | 'calls' | 'contacts'>('messages');

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

      {/* ─── Blue Gradient Header ─── */}
      <header className="relative px-5 pt-12 pb-20 text-white bg-header-gradient">
        {/* Top row: hamburger + title + avatar */}
        <div className="flex justify-between items-center mb-1">
          <button aria-label="Menu" className="p-1">
            <div className="flex flex-col space-y-1.5">
              <span className="block w-5 h-0.5 bg-white/70 rounded-full" />
              <span className="block w-3.5 h-0.5 bg-white/70 rounded-full" />
            </div>
          </button>
          <h1 className="text-sm font-black tracking-[0.2em] uppercase text-white/90">Messages</h1>
          <button
            aria-label="My profile"
            className="w-9 h-9 rounded-full bg-white/20 border border-white/30 overflow-hidden flex items-center justify-center shadow-sm"
          >
            {avatarUrl ? (
              <img src={avatarUrl} className="w-full h-full object-cover" alt="" />
            ) : (
              <span className="text-xs font-black text-white">{getInitials(user?.name)}</span>
            )}
          </button>
        </div>

        {/* Stories row — inside the header */}
        <div className="mt-6">
          <SoftStories stories={onlineUsers} />
        </div>
      </header>

      {/* ─── Search bar (overlaps header) ─── */}
      <div className="px-5 -mt-6 z-10 relative">
        <div className="flex items-center bg-white rounded-2xl px-4 py-3 shadow-blue">
          <MagnifyingGlassIcon className="w-4 h-4 text-soft-text-secondary mr-3 flex-shrink-0" />
          <input
            type="text"
            placeholder="Search friends..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-soft-text-primary placeholder-soft-text-secondary font-medium text-sm"
          />
        </div>
      </div>

      <div className="flex-1 mt-4 px-0 overflow-y-auto min-h-0 chat-list-panel pb-28">
        <SoftChatList
          conversations={filteredConversations}
          currentUser={user}
          onChatClick={handleChatClick}
          loading={loading}
        />
      </div>

      {/* ─── Bottom Navigation ─── */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-xl mx-auto bg-white/95 backdrop-blur-xl border-t border-slate-100 z-40">
        <div className="flex justify-around items-end px-8 pt-3 pb-7">
          {/* Messages tab */}
          <button
            aria-label="Messages"
            onClick={() => setActiveTab('messages')}
            className="flex flex-col items-center space-y-1"
          >
            <div className={`p-2.5 rounded-2xl transition-all ${activeTab === 'messages' ? 'bg-primary-100' : ''}`}>
              <ChatBubbleOvalLeftEllipsisIcon className={`w-6 h-6 ${activeTab === 'messages' ? 'text-soft-primary' : 'text-slate-400'}`} />
            </div>
          </button>

          {/* FAB - New Message */}
          <div className="relative -mt-8">
            <button
              aria-label="New Message"
              className="w-14 h-14 rounded-full flex items-center justify-center text-white shadow-blue active:scale-95 transition-transform bg-fab-gradient"
            >
              <PlusIcon className="w-7 h-7 stroke-[2.5px]" />
            </button>
          </div>

          {/* Calls tab */}
          <button
            aria-label="Calls"
            onClick={() => setActiveTab('calls')}
            className="flex flex-col items-center space-y-1"
          >
            <div className={`p-2.5 rounded-2xl transition-all ${activeTab === 'calls' ? 'bg-primary-100' : ''}`}>
              <PhoneIcon className={`w-6 h-6 ${activeTab === 'calls' ? 'text-soft-primary' : 'text-slate-400'}`} />
            </div>
          </button>

          {/* Contacts tab */}
          <button
            aria-label="Contacts"
            onClick={() => setActiveTab('contacts')}
            className="flex flex-col items-center space-y-1"
          >
            <div className={`p-2.5 rounded-2xl transition-all ${activeTab === 'contacts' ? 'bg-primary-100' : ''}`}>
              <UserIcon className={`w-6 h-6 ${activeTab === 'contacts' ? 'text-soft-primary' : 'text-slate-400'}`} />
            </div>
          </button>
        </div>
      </nav>
    </div>
  );
};

export default MessagesPage;
