import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { chatAPI } from '../services/api';
import { getSocket } from '../services/socket';
import { getCurrentUser } from '../utils/helpers';
import { MagnifyingGlassIcon, StarIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';

export default function ChatList() {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL'); // ALL, UNREAD, FAVORITES, GROUPS
  const [favorites, setFavorites] = useState([]);

  // Memoize currentUser — localStorage read is slow if called on every render
  const currentUser = useMemo(() => getCurrentUser(), []);

  // Load favorites from local storage on mount
  useEffect(() => {
    try {
      const favs = JSON.parse(localStorage.getItem('chat_favorites') || '[]');
      setFavorites(favs);
    } catch (e) {}
  }, []);

  const toggleFavorite = (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    setFavorites(prev => {
      const newFavs = prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id];
      localStorage.setItem('chat_favorites', JSON.stringify(newFavs));
      return newFavs;
    });
  };

  const fetchConversations = useCallback(async () => {
    try {
      const response = await chatAPI.getConversations();
      setConversations(response.data.conversations || []);
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();

    const socket = getSocket();
    if (socket) {
      // 1. Real-time: update conversation list when new message arrives
      const handleNewMessage = (data) => {
        setConversations(prev => {
          const updated = prev.map(conv => {
            if (conv.id === data.conversationId) {
              const isFromMe = data.message.senderId === currentUser?.id;
              return {
                ...conv,
                lastMessage: data.message,
                lastMessageAt: data.message.createdAt,
                unreadCount: isFromMe ? (conv.unreadCount || 0) : (conv.unreadCount || 0) + 1
              };
            }
            return conv;
          });
          
          // Re-sort current conversations list by latest message
          return [...updated].sort((a, b) =>
            new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0)
          );
        });
      };

      // 2. Real-time: update online/offline status
      const handleStatusChange = (data) => {
        setConversations(prev => prev.map(conv => {
          const participants = conv.participants?.map(p => {
            if (p.userId === data.userId) {
              return { 
                ...p, 
                user: { ...p.user, isOnline: data.isOnline, lastSeen: data.lastSeen } 
              };
            }
            return p;
          });
          return { ...conv, participants };
        }));
      };

      // 3. Real-time: reset unread count when messages are marked as read
      const handleMessagesRead = (data) => {
        if (data.userId === currentUser?.id) {
          setConversations(prev => prev.map(conv => 
            conv.id === data.conversationId ? { ...conv, unreadCount: 0 } : conv
          ));
        }
      };

      socket.on('new-message', handleNewMessage);
      socket.on('user-status-changed', handleStatusChange);
      socket.on('messages-read', handleMessagesRead);

      return () => {
        socket.off('new-message', handleNewMessage);
        socket.off('user-status-changed', handleStatusChange);
        socket.off('messages-read', handleMessagesRead);
      };
    }
  }, [fetchConversations, currentUser]);

  const getConversationName = useCallback((conversation) => {
    if (conversation.name) return conversation.name;
    const otherParticipant = conversation.participants?.find(
      p => p.userId !== currentUser?.id
    );
    return otherParticipant?.user?.name || 'Unknown User';
  }, [currentUser]);

  const getLastMessagePreview = (conversation) => {
    if (!conversation.lastMessage) return 'No messages yet';
    const { content, type } = conversation.lastMessage;
    if (type === 'VOICE') return '🎙️ Voice memo';
    if (type === 'IMAGE') return '📷 Image';
    if (type === 'FILE') return '📎 File attachment';
    if (!content) return 'No messages yet';
    return content.length > 40 ? content.substring(0, 40) + '...' : content;
  };

  const isConversationUnread = (conv) => {
    return (conv.unreadCount || 0) > 0;
  };

  const filteredConversations = useMemo(() => {
    return conversations.filter(conv => {
      // 1. Search filter
      const name = getConversationName(conv).toLowerCase();
      const lastMsg = (conv.lastMessage?.content || '').toLowerCase();
      if (search && !(name.includes(search.toLowerCase()) || lastMsg.includes(search.toLowerCase()))) return false;

      // 2. Category filter
      if (filter === 'UNREAD') return isConversationUnread(conv);
      if (filter === 'FAVORITES') return favorites.includes(conv.id);
      if (filter === 'GROUPS') return conv.type === 'GROUP' || conv.type === 'COURSE';
      if (filter === 'READ') return !isConversationUnread(conv);
      
      return true; // ALL
    });
  }, [conversations, search, filter, favorites, getConversationName]);

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse flex space-x-4">
            <div className="rounded-full bg-gray-200 h-12 w-12"></div>
            <div className="flex-1 space-y-2 py-1">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Search & Filters */}
      <div className="p-4 border-b border-gray-100 flex flex-col space-y-3 bg-white sticky top-0 z-10">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search name or message..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-gray-50 border-none rounded-2xl py-2.5 pl-10 pr-4 text-sm font-medium focus:ring-2 focus:ring-blue-100 transition-all outline-none"
          />
        </div>
        <div className="flex items-center space-x-2 overflow-x-auto scrollbar-hide pb-1">
          {['ALL', 'UNREAD', 'READ', 'FAVORITES', 'GROUPS'].map(tab => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
                filter === tab 
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30' 
                  : 'bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-800'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="divide-y divide-gray-50 flex-1 overflow-y-auto">
        {filteredConversations.length === 0 ? (
          <div className="p-12 text-center text-gray-500 bg-white">
            <div className="w-16 h-16 bg-blue-50 text-blue-400 rounded-full flex items-center justify-center mx-auto mb-4">
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a.596.596 0 0 1-.474-.065.503.503 0 0 1-.209-.435 5.106 5.106 0 0 1 .358-1.585 9.049 9.049 0 0 1-2.113-21.366C4.42 2.33 8.01 1.5 12 1.5c4.97 0 9 3.694 9 8.25Z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900">No conversations found</h3>
            <p className="text-sm mt-1 text-gray-400">Try adjusting your filters or search</p>
          </div>
        ) : (
          filteredConversations.map((conversation) => {
            const isUnread = isConversationUnread(conversation);
            const isFav = favorites.includes(conversation.id);
            const unreadCount = conversation.unreadCount || 0;
            
            return (
              <Link
                key={conversation.id}
                href={`/chat/${conversation.id}`}
                className={`block p-4 hover:bg-gray-50 transition-all border-l-4 group relative ${isUnread ? 'border-blue-600 bg-blue-50/30' : 'border-transparent'}`}
              >
                <div className="flex items-center space-x-3">
                  {/* Avatar Section */}
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white font-semibold shadow-sm group-hover:scale-105 transition-transform duration-200 overflow-hidden">
                      {conversation.avatar ? (
                        <img src={conversation.avatar} alt={getConversationName(conversation)} className="w-full h-full object-cover" />
                      ) : (
                        getConversationName(conversation).charAt(0).toUpperCase()
                      )}
                    </div>
                    {/* Online status indicator */}
                    {conversation.type === 'DIRECT' && conversation.participants?.find(p => p.userId !== currentUser?.id)?.user?.isOnline && (
                      <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"></div>
                    )}
                  </div>

                  {/* Content Section */}
                  <div className="flex-1 min-w-0 pr-10">
                    <div className="flex justify-between items-start">
                      <h3 className={`text-sm truncate pr-2 ${isUnread ? 'font-black text-blue-900' : 'font-bold text-gray-900'}`}>
                        {getConversationName(conversation)}
                      </h3>
                      {conversation.lastMessageAt && (
                        <span className={`text-[10px] font-medium whitespace-nowrap mt-0.5 ${isUnread ? 'text-blue-600' : 'text-gray-400'}`}>
                          {formatDistanceToNow(new Date(conversation.lastMessageAt), { addSuffix: true })}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <p className={`text-xs truncate transition-colors mr-2 ${isUnread ? 'font-semibold text-blue-800' : 'text-gray-500 group-hover:text-gray-900'}`}>
                        {getLastMessagePreview(conversation)}
                      </p>
                      {/* Unread Badge */}
                      {unreadCount > 0 && (
                        <span className="flex-shrink-0 bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center shadow-sm">
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Favorite Toggle Button */}
                <button 
                  onClick={(e) => toggleFavorite(e, conversation.id)}
                  className="absolute right-4 top-4 p-1.5 rounded-full text-gray-300 hover:text-yellow-400 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 z-10"
                >
                  {isFav ? <StarIconSolid className="w-5 h-5 text-yellow-400 opacity-100" /> : <StarIcon className="w-5 h-5" />}
                </button>
                {/* Always-visible Favorite indicator (unless hovering for toggle) */}
                {isFav && (
                  <div className="absolute right-4 top-4 p-1.5 pointer-events-none group-hover:hidden">
                    <StarIconSolid className="w-5 h-5 text-yellow-400" />
                  </div>
                )}
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
