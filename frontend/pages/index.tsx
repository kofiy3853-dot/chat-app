import React, { useState, useEffect, useMemo, useCallback, useRef, useEffect as uE } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Link from 'next/link';
import MagnifyingGlassIcon from '@heroicons/react/24/outline/MagnifyingGlassIcon';
import PlusIcon from '@heroicons/react/24/outline/PlusIcon';
import EllipsisVerticalIcon from '@heroicons/react/24/outline/EllipsisVerticalIcon';
import CheckIcon from '@heroicons/react/24/outline/CheckIcon';
import EnvelopeOpenIcon from '@heroicons/react/24/outline/EnvelopeOpenIcon';
import TrashIcon from '@heroicons/react/24/outline/TrashIcon';
import UserGroupIcon from '@heroicons/react/24/outline/UserGroupIcon';
import CameraIcon from '@heroicons/react/24/outline/CameraIcon';
import SparklesIcon from '@heroicons/react/24/outline/SparklesIcon';
import ChatBubbleOvalLeftEllipsisIcon from '@heroicons/react/24/outline/ChatBubbleOvalLeftEllipsisIcon';
import BookOpenIcon from '@heroicons/react/24/outline/BookOpenIcon';
import AdjustmentsHorizontalIcon from '@heroicons/react/24/outline/AdjustmentsHorizontalIcon';
import XMarkIcon from '@heroicons/react/24/outline/XMarkIcon';
import { getCurrentUser } from '../utils/helpers';
import { chatAPI, userAPI } from '../services/api';
import { getSocket } from '../services/socket';
import dynamic from 'next/dynamic';
import { getFullFileUrl, getInitials, getAvatarColor } from '../utils/helpers';
import { motion, AnimatePresence } from 'framer-motion';


const SoftChatList = dynamic(() => import('../components/SoftChatList'), { ssr: false, loading: () => <div className="p-4 text-center text-sm text-gray-400">Loading chats...</div> });
const SoftStories = dynamic(() => import('../components/SoftStories'), { ssr: false });
const NewChatModal = dynamic(() => import('../components/NewChatModal'), { ssr: false });
import { toast } from 'react-hot-toast';

const MessagesPage: React.FC = () => {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [imgError, setImgError] = useState(false);
  const [conversations, setConversations] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'messages' | 'calls' | 'contacts'>('messages');
  const [typingInConvs, setTypingInConvs] = useState<{ [key: string]: { [userId: string]: string } }>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedConversations, setSelectedConversations] = useState<Set<string>>(new Set());
  const [chatFilter, setChatFilter] = useState<'all' | 'unread' | 'groups' | 'courses'>('all');
  const [showOverflow, setShowOverflow] = useState(false);
  const [showFAB, setShowFAB] = useState(false);
  const overflowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const localUser = getCurrentUser();
    if (!localUser) { router.push('/login'); return; }
    setUser(localUser);
    
    // Optimistic cache loading for instant SPA feeling
    const cachedChats = localStorage.getItem('cached_conversations');
    if (cachedChats) {
      try {
        setConversations(JSON.parse(cachedChats));
        setLoading(false);
      } catch (e) {
        console.error('Cache parse error');
      }
    }
    fetchData();
  }, [router]);

  const avatarUrl = useMemo(() => {
    return user ? getFullFileUrl(user.avatar) : null;
  }, [user]);

  // Close overflow menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (overflowRef.current && !overflowRef.current.contains(e.target as Node)) {
        setShowOverflow(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (!user) return;
    const socket = getSocket();
    if (!socket) return;

    const handleUserTyping = (data: any) => {
      const { conversationId, userId, userName, isTyping } = data;
      if (userId === user.id) return;
      setTypingInConvs((prev) => {
        const next = { ...prev };
        if (isTyping) {
          next[conversationId] = { ...(next[conversationId] || {}), [userId]: userName };
        } else {
          if (next[conversationId]) {
            const updated = { ...next[conversationId] };
            delete updated[userId];
            if (Object.keys(updated).length === 0) delete next[conversationId];
            else next[conversationId] = updated;
          }
        }
        return next;
      });
    };

    const handleNewMessage = (data: any) => {
      setConversations((prev) => {
        const idx = prev.findIndex((c) => c.id === data.conversationId);
        if (idx === -1) { fetchData(); return prev; }
        const updated = [...prev];
        const conv = { ...updated[idx] };
        conv.lastMessage = data.message;
        conv.lastMessageAt = data.message.createdAt;
        if (data.message.senderId !== user.id) {
          conv.unreadCount = (conv.unreadCount || 0) + 1;
        }
        updated[idx] = conv;
        return updated.sort((a, b) => new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime());
      });
    };

    const handleUserStatus = (data: any) => {
      setConversations(prev => prev.map(c => {
        const hasUser = c.participants?.some((p: any) => p.userId === data.userId);
        if (!hasUser) return c;
        return {
          ...c,
          participants: c.participants.map((p: any) => p.userId === data.userId ? { ...p, user: { ...p.user, isOnline: data.isOnline } } : p)
        };
      }));
    };

    socket.on('user-typing', handleUserTyping);
    socket.on('new-message', handleNewMessage);
    socket.on('user-status-changed', handleUserStatus);

    return () => {
      socket.off('user-typing', handleUserTyping);
      socket.off('new-message', handleNewMessage);
      socket.off('user-status-changed', handleUserStatus);
    };
  }, [user]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsModalOpen(true);
      }
      if (e.altKey) {
        if (e.key === '1') setChatFilter('all');
        if (e.key === '2') setChatFilter('courses');
        if (e.key === '3') setChatFilter('groups');
        if (e.key === '4') setChatFilter('unread');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const fetchData = async () => {
    try {
      const convRes = await chatAPI.getConversations();
      const newChats = convRes.data.conversations || [];
      setConversations(newChats);
      // Update cache
      localStorage.setItem('cached_conversations', JSON.stringify(newChats));
    } catch (err) {
      console.error('Fetch data error:', err);
    } finally {
      setLoading(false);
    }
  };

  const startNanaChat = () => {
    router.push('/nana');
  };

  const filteredConversations = useMemo(() => {
    let filtered = conversations;
    if (chatFilter === 'unread') filtered = filtered.filter(c => (c.unreadCount || 0) > 0);
    else if (chatFilter === 'groups') filtered = filtered.filter(c => c.type === 'GROUP');
    else if (chatFilter === 'courses') filtered = filtered.filter(c => c.type === 'COURSE');
    
    return filtered.filter(conv => {
      const name = (conv.name || conv.participants?.find((p: any) => p.userId !== user?.id)?.user?.name || '').toLowerCase();
      const lastMsg = (conv.lastMessage?.content || '').toLowerCase();
      return name.includes(search.toLowerCase()) || lastMsg.includes(search.toLowerCase());
    });
  }, [conversations, search, user, chatFilter]);

  const handleChatClick = useCallback((id: string) => {
    const conv = conversations.find(c => c.id === id);
    const hasNana = conv?.participants?.some((p: any) => p.user?.role === 'NANA');
    const isDirect = conv?.type === 'DIRECT';

    if (isDirect && hasNana && user?.role !== 'NANA') {
      router.push('/nana');
    } else {
      router.push(`/chat/${id}`);
    }
  }, [router, conversations, user]);

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!window.confirm('Delete this conversation?')) return;
    
    // Optimistic Update: remove from UI immediately
    const originalConversations = [...conversations];
    setConversations(prev => prev.filter(c => c.id !== id));
    
    try {
      await chatAPI.deleteConversation(id);
    } catch (err) {
      toast.error('Could not delete chat. Please try again.');
    }
  };

  const totalUnread = conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0);

  if (!user) return null;

  return (
    <div className="h-[100dvh] flex flex-col max-w-xl mx-auto relative overflow-hidden bg-white font-sans">
      <Head>
        <title>Messages | Campus Chat</title>
      </Head>

      {/* ─── Header ─── */}
      <header className="sticky top-0 z-30 bg-primary-600 px-4 pt-[max(env(safe-area-inset-top,0px),40px)] pb-3 shadow-md transition-colors">
        <div className="flex items-center justify-between mb-3">
          {/* Avatar */}
          <button
            onClick={() => router.push('/account')}
            aria-label="Profile"
            className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-white/30 active:scale-95 transition-all bg-white"
          >
            {avatarUrl && !imgError ? (
              <img 
                src={avatarUrl} 
                className="w-full h-full object-cover" 
                alt="" 
                onError={() => setImgError(true)}
              />
            ) : (
              <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br ${getAvatarColor(user?.name)} text-white text-xs font-bold`}>
                {getInitials(user?.name)}
              </div>
            )}
          </button>

          {/* Title and Branding */}
          <div className="flex flex-col items-center">
            <h1 className="text-xl font-black text-white tracking-tight leading-tight">KTU Campus</h1>
            <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest -mt-0.5">Innovating for Development</p>
          </div>

          {/* Overflow Menu */}
          <div className="relative" ref={overflowRef}>
            <button
              aria-label="More options"
              onClick={() => setShowOverflow(v => !v)}
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10 active:scale-95 transition-all text-white"
            >
              <EllipsisVerticalIcon className="w-5 h-5" />
            </button>

            <AnimatePresence>
              {showOverflow && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.92, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.92, y: -4 }}
                  transition={{ duration: 0.12 }}
                  className="absolute right-0 top-11 w-52 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 py-1"
                >
                  <button
                    className="w-full flex items-center space-x-3 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    onClick={() => {
                      if (selectedConversations.size === filteredConversations.length) {
                        setSelectedConversations(new Set());
                      } else {
                        setSelectedConversations(new Set(filteredConversations.map(c => c.id)));
                      }
                      setShowOverflow(false);
                    }}
                  >
                    <CheckIcon className="w-4 h-4 text-gray-400" />
                    <span>{selectedConversations.size === filteredConversations.length && filteredConversations.length > 0 ? 'Deselect All' : 'Select All'}</span>
                  </button>
                  <button
                    className="w-full flex items-center space-x-3 px-4 py-3 text-sm font-medium text-primary-600 hover:bg-primary-50 transition-colors"
                    onClick={async () => {
                      try { await chatAPI.markAllAsRead(); fetchData(); } catch (err) { console.error(err); }
                      setShowOverflow(false);
                    }}
                  >
                    <EnvelopeOpenIcon className="w-4 h-4" />
                    <span>Mark All as Read</span>
                  </button>
                  {selectedConversations.size > 0 && (
                    <>
                      <div className="h-px bg-gray-100 mx-3" />
                      <button
                        className="w-full flex items-center space-x-3 px-4 py-3 text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
                        onClick={async () => {
                          if (window.confirm(`Delete ${selectedConversations.size} conversations?`)) {
                            try {
                              await chatAPI.deleteMultipleConversations(Array.from(selectedConversations));
                              setSelectedConversations(new Set());
                              fetchData();
                            } catch (err) { console.error(err); }
                          }
                          setShowOverflow(false);
                        }}
                      >
                        <TrashIcon className="w-4 h-4" />
                        <span>Delete ({selectedConversations.size})</span>
                      </button>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Search Bar */}
        <div className="flex items-center bg-white/15 backdrop-blur-sm rounded-xl px-3.5 py-2.5 space-x-2 border border-white/10">
          <MagnifyingGlassIcon className="w-4 h-4 text-white/50 flex-shrink-0" />
          <input
            id="search"
            name="search"
            type="text"
            placeholder="Search chats..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-white placeholder-white/40 text-sm font-medium"
          />
          {search ? (
            <button onClick={() => setSearch('')} aria-label="Clear search">
              <XMarkIcon className="w-4 h-4 text-white/50" />
            </button>
          ) : (
            <button
              aria-label="Filter options"
              onClick={() => setChatFilter(chatFilter === 'all' ? 'unread' : 'all')}
              className={`flex-shrink-0 ${chatFilter !== 'all' ? 'text-white' : 'text-white/40'}`}
            >
              <AdjustmentsHorizontalIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* ─── Stories Section ─── */}
      <div className="bg-white px-2 pt-2 pb-1 border-b border-gray-100">
        <SoftStories currentUser={user} />
      </div>

      {/* ─── Nana AI Hub Link ─── */}
      {!search && user?.role !== 'NANA' && (
        <div className="bg-white px-4 pt-3 pb-1">
          <Link href="/nana">
            <div className="relative group overflow-hidden bg-gradient-to-br from-primary-600 to-indigo-700 rounded-2xl p-4 shadow-lg shadow-primary-200 cursor-pointer active:scale-[0.98] transition-all">
              <div className="absolute top-[-10px] right-[-10px] p-3 opacity-20 group-hover:scale-110 transition-transform">
                 <SparklesIcon className="w-20 h-20 text-white" />
              </div>
              <div className="flex items-center space-x-3.5 relative z-10">
                <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white font-black text-xl border border-white/30 shadow-inner">N</div>
                <div>
                  <h3 className="text-white font-black text-sm tracking-tight mb-0.5">Nana AI Hub</h3>
                  <p className="text-white/80 text-[11px] font-bold uppercase tracking-widest flex items-center">
                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full mr-2 animate-pulse"></span>
                    Campus Assistant • Active Now
                  </p>
                </div>
              </div>
            </div>
          </Link>
        </div>
      )}

      {/* ─── Segmented Filter + Count Row ─── */}
      <div className="sticky top-[130px] z-20 bg-white px-4 py-2.5 border-b border-gray-100 flex items-center justify-between">
        {/* Segmented Control */}
        <div className="inline-flex items-center bg-gray-100 rounded-xl p-0.5 space-x-0.5">
          {(['all', 'courses', 'groups', 'unread'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setChatFilter(f)}
              className={`px-4 py-1.5 rounded-[10px] text-xs font-semibold capitalize transition-all ${
                chatFilter === f
                  ? 'bg-white text-gray-900 shadow-sm font-bold'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {f === 'groups' ? 'Hubs' : f}
            </button>
          ))}
        </div>

        {/* Unread Badge */}
        {totalUnread > 0 && (
          <span className="text-[11px] font-semibold text-gray-400">
            {totalUnread} unread
          </span>
        )}
      </div>

      {/* ─── Chat List ─── */}
      <main className="flex-1 overflow-y-auto no-scrollbar pb-[max(env(safe-area-inset-bottom,0px),100px)] bg-white">
        <AnimatePresence mode="wait">
          {activeTab === 'messages' && (
            <motion.div
              key="messages"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <SoftChatList
                conversations={filteredConversations}
                currentUser={user}
                onChatClick={handleChatClick}
                loading={loading}
                onStartChat={() => setIsModalOpen(true)}
                typingInConvs={typingInConvs}
                onDelete={handleDelete}
                selectedIds={selectedConversations}
                onToggleSelect={(id) => {
                  setSelectedConversations(prev => {
                    const next = new Set(prev);
                    if (next.has(id)) next.delete(id);
                    else next.add(id);
                    return next;
                  });
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* ─── Floating Action Button ─── */}
      <div className="fixed bottom-24 right-4 z-[200]">
        <div className="relative">
          <AnimatePresence>
            {showFAB && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.9 }}
                transition={{ duration: 0.15 }}
                className="absolute bottom-16 right-0 w-48 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden py-1"
              >
                <button
                  onClick={() => { startNanaChat(); setShowFAB(false); }}
                  className="w-full flex items-center space-x-3 px-4 py-3 text-sm font-black text-primary-600 hover:bg-primary-50 transition-colors"
                >
                  <div className="w-8 h-8 rounded-xl bg-primary-100 flex items-center justify-center text-primary-600 shadow-sm shadow-primary-500/10">
                    <SparklesIcon className="w-5 h-5" />
                  </div>
                  <span>✨ Ask Nana AI</span>
                </button>
                <div className="h-px bg-gray-100 mx-3" />
                <button
                  onClick={() => { setIsModalOpen(true); setShowFAB(false); }}
                  className="w-full flex items-center space-x-3 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                    <ChatBubbleOvalLeftEllipsisIcon className="w-4 h-4" />
                  </div>
                  <span>New Chat</span>
                </button>
                <button
                  onClick={() => { setIsModalOpen(true); setShowFAB(false); }}
                  className="w-full flex items-center space-x-3 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                    <UserGroupIcon className="w-4 h-4" />
                  </div>
                  <span>New Group</span>
                </button>
                <button
                  onClick={() => { router.push('/status'); setShowFAB(false); }}
                  className="w-full flex items-center space-x-3 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                    <CameraIcon className="w-4 h-4" />
                  </div>
                  <span>New Status</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            aria-label="New message"
            onClick={() => setShowFAB(v => !v)}
            className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all active:scale-95 ${showFAB ? 'bg-gray-800 rotate-45' : 'bg-primary-600 shadow-primary-200'}`}
          >
            <PlusIcon className="w-6 h-6 text-white stroke-[2.5px]" />
          </button>
        </div>
      </div>

      <NewChatModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
};

export default MessagesPage;
