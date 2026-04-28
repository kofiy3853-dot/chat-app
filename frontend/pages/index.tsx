import React, { useState, useEffect, useMemo, useCallback, useRef, useDeferredValue } from 'react';
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


const SoftChatList = dynamic(() => import('../components/SoftChatList'), { ssr: false, loading: () => <div className="p-4 text-center text-sm text-gray-400">Loading chats...</div> });
const SoftStories = dynamic(() => import('../components/SoftStories'), { ssr: false });
const NewChatModal = dynamic(() => import('../components/NewChatModal'), { ssr: false });
const UploadStatusModal = dynamic(() => import('../components/UploadStatusModal'), { ssr: false });
import { toast } from 'react-hot-toast';



const MessagesPage: React.FC = () => {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [imgError, setImgError] = useState(false);
  const [conversations, setConversations] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'messages' | 'calls' | 'contacts'>('messages');
  const [typingInConvs, setTypingInConvs] = useState<{ [key: string]: { [userId: string]: string } }>({});
  
  // State for Modals and Search
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [showOverflow, setShowOverflow] = useState(false);
  const [showFAB, setShowFAB] = useState(false);
  
  // State for Selections and Filters
  const [selectedConversations, setSelectedConversations] = useState<Set<string>>(new Set());
  const [chatFilter, setChatFilter] = useState<'all' | 'unread' | 'groups' | 'courses'>('all');
  
  // Refs
  const searchInputRef = useRef<HTMLInputElement>(null);
  const overflowRef = useRef<HTMLDivElement>(null);
  const isMounted = useRef(true);
  const isFetchingRef = useRef(false);

  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchOpen]);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  useEffect(() => {
    if (!isMounted.current) return;
    const localUser = getCurrentUser();
    if (localUser) {
      setUser(localUser);
      
      // Optimistic cache loading for instant SPA feeling
      const cachedChats = localStorage.getItem('cached_conversations');
      if (cachedChats) {
        try {
          const parsed = JSON.parse(cachedChats);
          if (isMounted.current) {
            setConversations(parsed);
            setLoading(false);
          }
        } catch (e) {
          console.error('Cache parse error');
        }
      }
      fetchData();
    }
  }, []); // Only on mount. Router-level guard handles the redirect if no user.

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
        
        const conv = prev[idx];
        // Deduplicate: If we already processed this message, skip
        if (conv.lastMessage?.id === data.message.id || (data.message.tempId && conv.lastMessage?.tempId === data.message.tempId)) {
          return prev;
        }

        const updated = [...prev];
        const newConv = { ...conv };
        newConv.lastMessage = data.message;
        newConv.lastMessageAt = data.message.createdAt;
        if (data.message.senderId !== user.id && router.query.id !== data.conversationId) {
          newConv.unreadCount = (newConv.unreadCount || 0) + 1;
        }
        updated[idx] = newConv;
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

    const handleTotalUnread = (data: any) => {
      // If we receive a definitive count from the server, we should ideally refresh or trust it
      // For now, let's just trigger a re-fetch if the count changes significantly, 
      // or we can update the local conversations count if the payload includes details.
      fetchData(); 
    };

    socket.on('user-typing', handleUserTyping);
    socket.on('new-message', handleNewMessage);
    socket.on('user-status-changed', handleUserStatus);
    socket.on('total-unread-chat-count', handleTotalUnread);

    return () => {
      socket.off('user-typing', handleUserTyping);
      socket.off('new-message', handleNewMessage);
      socket.off('user-status-changed', handleUserStatus);
      socket.off('total-unread-chat-count', handleTotalUnread);
    };
  }, [user]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsModalOpen(true);
      }
      if (e.key === 'Escape') {
        setIsSearchOpen(false);
        setSearch('');
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
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      const convRes = await chatAPI.getConversations();
      if (!isMounted.current) return;
      const newChats = convRes.data.conversations || [];
      setConversations(newChats);
      try {
        localStorage.setItem('cached_conversations', JSON.stringify(newChats));
      } catch (e: any) {
        console.warn('Cache write skipped:', e?.message);
      }
    } catch (err) {
      console.error('Fetch data error:', err);
    } finally {
      isFetchingRef.current = false;
      if (isMounted.current) setLoading(false);
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
      const name = (conv.name || (conv.participants || []).find((p: any) => p.userId !== user?.id)?.user?.name || '').toLowerCase();
      const lastMsg = (conv.lastMessage?.content || '').toLowerCase();
      return name.includes(deferredSearch.toLowerCase()) || lastMsg.includes(deferredSearch.toLowerCase());
    });
  }, [conversations, deferredSearch, user, chatFilter]);

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
    const updatedConversations = conversations.filter(c => c.id !== id);
    setConversations(updatedConversations);
    
    // Update cache immediately to prevent flash-reappearance on re-renders
    localStorage.setItem('cached_conversations', JSON.stringify(updatedConversations));
    
    try {
      await chatAPI.deleteConversation(id);
    } catch (err) {
      // Revert on failure
      setConversations(conversations);
      localStorage.setItem('cached_conversations', JSON.stringify(conversations));
      toast.error('Could not delete chat. Please try again.');
    }
  };

  const totalUnread = conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0);

  if (!user) return null;

  return (
    <div className="h-[100dvh] flex flex-col max-w-xl mx-auto relative overflow-hidden font-sans w-full bg-[var(--bg-page)]">
      <Head>
        <title>Messages | Campus Chat</title>
      </Head>

      {/* ─── Header ─── */}
      <header 
        className="w-full z-[100] px-3 pt-[max(env(safe-area-inset-top,0px),12px)] pb-2 border-b shrink-0 flex flex-col bg-[var(--bg-navbar)] text-[var(--text-navbar)] border-[var(--border)]"
      >
        <div className="flex items-center justify-between">
          {/* Avatar */}
          <button
            onClick={() => router.push('/account')}
            aria-label="Profile"
            className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-white/30 active: bg-white"
          >
            {avatarUrl && !imgError ? (
              <img 
                src={avatarUrl} 
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover" 
                alt={user?.name} 
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
            <h1 className="text-xl font-black tracking-tight leading-tight text-[var(--text-navbar)]">KTU Campus</h1>
            <p className="text-[10px] font-bold uppercase tracking-widest -mt-0.5 text-[color-mix(in_srgb,var(--text-navbar),transparent_30%)]">Innovating for Development</p>
          </div>

          <div className="flex items-center space-x-1" ref={overflowRef}>
            <button
              aria-label="Search chats"
              onClick={() => {
                setIsSearchOpen(v => !v);
                if (isSearchOpen) setSearch('');
              }}
              className={`w-9 h-9 flex items-center justify-center rounded-full hover:bg-black/5 active:  ${isSearchOpen ? 'text-primary-600 bg-primary-50' : 'text-[var(--text-navbar)]'}`}
            >
              {isSearchOpen ? <XMarkIcon className="w-5 h-5" /> : <MagnifyingGlassIcon className="w-5 h-5" />}
            </button>
            <button
              aria-label="More options"
              onClick={() => setShowOverflow(v => !v)}
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-black/5 active:"
              style={{ color: 'var(--text-navbar)' }}
            >
              <EllipsisVerticalIcon className="w-5 h-5" />
            </button>

              {showOverflow && (
                <div
                  className="absolute right-0 top-11 w-52 bg-surface rounded-2xl border border-app-light overflow-hidden z-50 py-1"
                >
                  <button
                    className="w-full flex items-center space-x-3 px-4 py-3 text-sm font-medium text-app-secondary hover:bg-surface-2"
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
                    className="w-full flex items-center space-x-3 px-4 py-3 text-sm font-medium text-primary-600 hover:bg-primary-50"
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
                        className="w-full flex items-center space-x-3 px-4 py-3 text-sm font-medium text-red-500 hover:bg-red-50"
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
                </div>
              )}
          </div>
        </div>

      </header>
      
      {/* ─── Search Bar (Collapsible) ─── */}
      <div 
        className={`  -out border-b border-[var(--border)] bg-[var(--bg-surface)] overflow-hidden ${
          isSearchOpen ? 'max-h-20 opacity-100 py-3 px-4' : 'max-h-0 opacity-0 py-0 px-4 pointer-events-none'
        }`}
      >
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-4 w-4 text-app-muted group-focus-within:text-primary-500" />
          </div>
          <input
            ref={searchInputRef}
            type="text"
            className="block w-full pl-10 pr-4 py-2.5 bg-[var(--bg-page)] border border-[var(--border)] rounded-2xl text-sm font-semibold text-app-primary placeholder-app-muted focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 shadow-sm"
            placeholder="Search chats..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search chats"
          />
        </div>
      </div>

      {/* ─── Stories Section ─── */}
      <div className="px-2 pt-2 pb-1 border-b bg-[var(--bg-surface)] border-[var(--border)]">
        <SoftStories currentUser={user} />
      </div>

      {/* ─── Nana AI Hub Link ─── */}
      {!search && user?.role !== 'NANA' && (
        <div className="px-4 pt-3 pb-1 bg-[var(--bg-page)]">
          <Link href="/nana">
            <div className="relative group overflow-hidden bg-primary-600 rounded-2xl p-4 cursor-pointer active:]">
              <div className="absolute top-[-10px] right-[-10px] p-3 opacity-20 group-hover:">
                 <SparklesIcon className="w-20 h-20 text-white" />
              </div>
              <div className="flex items-center space-x-3.5 relative z-10">
                <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center text-white font-black text-xl border border-white/30">N</div>
                <div>
                  <h3 className="text-white font-black text-sm tracking-tight mb-0.5">Nana AI Hub</h3>
                  <p className="text-white/80 text-[11px] font-bold uppercase tracking-widest flex items-center">
                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full mr-2"></span>
                    Campus Assistant • Active Now
                  </p>
                </div>
              </div>
            </div>
          </Link>
        </div>
      )}

      {/* ─── Segmented Filter + Count Row ─── */}
      <div className="sticky top-[130px] z-20 px-4 py-2.5 border-b flex items-center justify-between shadow-sm bg-[var(--bg-surface)] border-[var(--border)]">
        {/* Segmented Control */}
        <div className="inline-flex items-center rounded-xl p-0.5 space-x-0.5 bg-[var(--bg-page)]">
          {(['all', 'courses', 'groups', 'unread'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setChatFilter(f)}
              className={`px-4 py-1.5 rounded-[10px] text-xs font-semibold capitalize  ${
                chatFilter === f
                  ? 'bg-surface text-app-primary shadow-sm font-bold'
                  : 'text-app-muted hover:text-app-secondary'
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
      <main className="flex-1 overflow-y-auto no-scrollbar pb-[max(env(safe-area-inset-bottom,0px),100px)] bg-[var(--bg-page)]">
          {activeTab === 'messages' && (
            <div>
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
            </div>
          )}
      </main>

      {/* ─── Floating Action Button ─── */}
      <div className="fixed bottom-24 right-4 z-[200]">
        <div className="relative">
            {showFAB && (
              <div
                className="absolute bottom-16 right-0 w-48 bg-surface rounded-2xl border border-app-light overflow-hidden py-1"
              >
                <button
                  onClick={() => { startNanaChat(); setShowFAB(false); }}
                  className="w-full flex items-center space-x-3 px-4 py-3 text-sm font-black text-primary-600 hover:bg-primary-50"
                >
                  <div className="w-8 h-8 rounded-xl bg-primary-100 flex items-center justify-center text-primary-600">
                    <SparklesIcon className="w-5 h-5" />
                  </div>
                  <span>✨ Ask Nana AI</span>
                </button>
                <div className="h-px bg-gray-100 mx-3" />
                <button
                  onClick={() => { setIsModalOpen(true); setShowFAB(false); }}
                  className="w-full flex items-center space-x-3 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  <div className="w-8 h-8 rounded-xl bg-surface-2 flex items-center justify-center text-app-muted">
                    <ChatBubbleOvalLeftEllipsisIcon className="w-4 h-4" />
                  </div>
                  <span>New Chat</span>
                </button>
                <button
                  onClick={() => { setIsModalOpen(true); setShowFAB(false); }}
                  className="w-full flex items-center space-x-3 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                    <UserGroupIcon className="w-4 h-4" />
                  </div>
                  <span>New Group</span>
                </button>
                <button
                  onClick={() => { setIsStatusModalOpen(true); setShowFAB(false); }}
                  className="w-full flex items-center space-x-3 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                    <CameraIcon className="w-4 h-4" />
                  </div>
                  <span>New Status</span>
                </button>
              </div>
            )}

          <button
            aria-label="New message"
            onClick={() => setShowFAB(v => !v)}
            className={`w-14 h-14 rounded-full flex items-center justify-center  active: ${showFAB ? 'bg-gray-800 ' : 'bg-primary-600'}`}
          >
            <PlusIcon className="w-6 h-6 text-white stroke-[2.5px]" />
          </button>
        </div>
      </div>

      <NewChatModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      {isStatusModalOpen && (
        <UploadStatusModal onClose={() => setIsStatusModalOpen(false)} onSuccess={() => setIsStatusModalOpen(false)} />
      )}
    </div>
  );
};

export default MessagesPage;
