import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { chatAPI } from '../services/api';
import { getSocket } from '../services/socket';
import { getCurrentUser, formatRelativeTime } from '../utils/helpers';
import { 
  MagnifyingGlassIcon, 
  StarIcon, 
  ArchiveBoxIcon, 
  TrashIcon, 
  CheckIcon,
  CheckBadgeIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { motion, AnimatePresence } from 'framer-motion';

export default function ChatList() {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL'); // ALL, UNREAD, FAVORITES, GROUPS
  const [favorites, setFavorites] = useState([]);
  const [typingInConvs, setTypingInConvs] = useState({}); // { [id]: { [userId]: userName } }

  // Memoize currentUser
  const currentUser = useMemo(() => getCurrentUser(), []);

  // Load favorites
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

  const handleArchive = async (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await chatAPI.archiveConversation(id);
      fetchConversations();
    } catch (e) {
      console.error('Failed to archive:', e);
    }
  };

  const handleDelete = async (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this conversation? This will hide it for you.')) {
      try {
        await chatAPI.deleteConversation(id);
        setConversations(prev => prev.filter(c => c.id !== id));
      } catch (e) {
        console.error('Failed to delete:', e);
      }
    }
  };

  useEffect(() => {
    fetchConversations();

    const socket = getSocket();
    if (socket) {
      // Listen for typing events across all conversations
      socket.emit('join-conversations'); // Ensure we get join feedback

      const handleUserTyping = (data) => {
        setTypingInConvs(prev => {
          const newTyping = { ...prev };
          const convId = data.conversationId;
          const uId = data.userId;
          const uName = data.userName;

          if (data.isTyping && uId !== currentUser?.id) {
            newTyping[convId] = { ...(newTyping[convId] || {}), [uId]: uName };
          } else {
            if (newTyping[convId]) {
              const updated = { ...newTyping[convId] };
              delete updated[uId];
              if (Object.keys(updated).length === 0) {
                delete newTyping[convId];
              } else {
                newTyping[convId] = updated;
              }
            }
          }
          return newTyping;
        });
      };

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
          return [...updated].sort((a, b) => {
            const dateA = new Date(a.lastMessageAt || 0);
            const dateB = new Date(b.lastMessageAt || 0);
            const timeA = (dateA instanceof Date && !isNaN(dateA.getTime())) ? dateA.getTime() : 0;
            const timeB = (dateB instanceof Date && !isNaN(dateB.getTime())) ? dateB.getTime() : 0;
            return timeB - timeA;
          });
        });
      };

      const handleStatusChange = (data) => {
        setConversations(prev => prev.map(conv => {
          const participants = conv.participants?.map(p => {
            if (p.userId === data.userId) {
              return { ...p, user: { ...p.user, isOnline: data.isOnline, lastSeen: data.lastSeen } };
            }
            return p;
          });
          return { ...conv, participants };
        }));
      };

      const handleMessagesRead = (data) => {
        // If someone read the messages, update our list to show "Seen" status
        setConversations(prev => prev.map(conv => {
          if (conv.id === data.conversationId) {
            const updated = { ...conv };
            if (data.userId === currentUser?.id) {
              updated.unreadCount = 0;
            }
            // Update lastMessage readReceipts if they exist
            if (updated.lastMessage) {
               const alreadyExists = updated.lastMessage.readReceipts?.some(r => r.userId === data.userId);
               if (!alreadyExists) {
                 updated.lastMessage = {
                   ...updated.lastMessage,
                   readReceipts: [...(updated.lastMessage.readReceipts || []), { userId: data.userId }]
                 };
               }
            }
            return updated;
          }
          return conv;
        }));
      };

      socket.on('user-typing', handleUserTyping);
      socket.on('new-message', handleNewMessage);
      socket.on('user-status-changed', handleStatusChange);
      socket.on('messages-read', handleMessagesRead);

      return () => {
        socket.off('user-typing');
        socket.off('new-message');
        socket.off('user-status-changed');
        socket.off('messages-read');
      };
    }
  }, [fetchConversations, currentUser]);

  const getConversationName = useCallback((conversation) => {
    if (conversation.name) return conversation.name;
    const otherParticipant = conversation.participants?.find(p => p.userId !== currentUser?.id);
    return otherParticipant?.user?.name || 'Unknown User';
  }, [currentUser]);

  const getMessageStatus = (conversation) => {
    const msg = conversation.lastMessage;
    if (!msg || msg.senderId !== currentUser?.id) return null;
    
    // Check if anyone else read it
    const isRead = msg.readReceipts?.some(r => r.userId !== currentUser?.id);
    return isRead ? (
      <CheckBadgeIcon className="w-3.5 h-3.5 text-blue-500" />
    ) : (
      <CheckIcon className="w-3.5 h-3.5 text-gray-300" />
    );
  };

  const getLastMessagePreview = (conversation) => {
    const typingUsers = typingInConvs[conversation.id];
    if (typingUsers) {
      const names = Object.values(typingUsers);
      return <span className="text-blue-600 font-black animate-pulse">{names[0]} is typing...</span>;
    }

    if (!conversation.lastMessage) return 'No messages yet';
    const { content, type } = conversation.lastMessage;
    if (type === 'VOICE') return '🎙️ Voice memo';
    if (type === 'IMAGE') return '📷 Image';
    if (type === 'FILE') return '📎 File attachment';
    if (!content) return 'No messages yet';
    return content.length > 40 ? content.substring(0, 40) + '...' : content;
  };

  const filteredConversations = useMemo(() => {
    return conversations.filter(conv => {
      const name = getConversationName(conv).toLowerCase();
      const lastMsg = (conv.lastMessage?.content || '').toLowerCase();
      if (search && !(name.includes(search.toLowerCase()) || lastMsg.includes(search.toLowerCase()))) return false;
      if (filter === 'UNREAD') return (conv.unreadCount || 0) > 0;
      if (filter === 'FAVORITES') return favorites.includes(conv.id);
      if (filter === 'GROUPS') return conv.type !== 'DIRECT';
      if (filter === 'READ') return (conv.unreadCount || 0) === 0;
      return true;
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
    <div className="flex flex-col h-full bg-white max-w-xl mx-auto border-x border-gray-50">
      <div className="p-4 border-b border-gray-100 flex flex-col space-y-3 bg-white/80 backdrop-blur-xl sticky top-0 z-20">
        <div className="relative group">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
          <input 
            type="text" 
            placeholder="Search messages..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-gray-50 border-none rounded-2xl py-3 pl-10 pr-4 text-sm font-medium focus:ring-2 focus:ring-blue-100 transition-all outline-none"
          />
        </div>
        <div className="flex items-center space-x-2 overflow-x-auto scrollbar-hide pb-1">
          {['ALL', 'UNREAD', 'READ', 'FAVORITES', 'GROUPS'].map(tab => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`whitespace-nowrap px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                filter === tab 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' 
                  : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
        <AnimatePresence>
          {filteredConversations.map((conversation) => (
            <ChatListItem 
              key={conversation.id}
              conversation={conversation}
              currentUser={currentUser}
              favorites={favorites}
              typingInConvs={typingInConvs}
              getConversationName={getConversationName}
              getLastMessagePreview={getLastMessagePreview}
              getMessageStatus={getMessageStatus}
              toggleFavorite={toggleFavorite}
              handleArchive={handleArchive}
              handleDelete={handleDelete}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

const ChatListItem = React.memo(({ 
  conversation, 
  currentUser, 
  favorites, 
  typingInConvs,
  getConversationName,
  getLastMessagePreview,
  getMessageStatus,
  toggleFavorite,
  handleArchive,
  handleDelete
}) => {
  return (
    <SwipeableItem 
      key={conversation.id} 
      onArchive={(e) => handleArchive(e, conversation.id)}
      onDelete={(e) => handleDelete(e, conversation.id)}
    >
      <Link
        href={`/chat/${conversation.id}`}
        className={`flex items-center p-4 space-x-3 hover:bg-gray-50 transition-colors group relative border-l-4 ${
          (conversation.unreadCount > 0) ? 'border-blue-500 bg-blue-50/20' : 'border-transparent'
        }`}
      >
        <div className="relative flex-shrink-0">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white text-xl font-bold shadow-sm group-hover:scale-105 transition-transform duration-300">
            {getConversationName(conversation).charAt(0).toUpperCase()}
          </div>
          {conversation.type === 'DIRECT' && conversation.participants?.find(p => p.userId !== currentUser?.id)?.user?.isOnline && (
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-baseline mb-1">
            <h3 className={`text-sm truncate pr-2 ${conversation.unreadCount > 0 ? 'font-black text-slate-900' : 'font-bold text-slate-700'}`}>
              {getConversationName(conversation)}
            </h3>
            <span className="text-[10px] text-gray-400 font-medium whitespace-nowrap">
              {formatRelativeTime(conversation.lastMessageAt, { addSuffix: false })}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1.5 min-w-0 flex-1">
              {getMessageStatus(conversation)}
              <p className={`text-xs truncate transition-colors ${conversation.unreadCount > 0 ? 'font-bold text-blue-900' : 'text-gray-500'}`}>
                {getLastMessagePreview(conversation)}
              </p>
            </div>
            {conversation.unreadCount > 0 && (
              <span className="bg-blue-600 text-white text-[10px] font-black h-5 min-w-[20px] px-1.5 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/20">
                {conversation.unreadCount}
              </span>
            )}
          </div>
        </div>

        <button 
          onClick={(e) => toggleFavorite(e, conversation.id)}
          className="absolute right-2 top-2 p-2 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          {favorites.includes(conversation.id) ? 
            <StarIconSolid className="w-5 h-5 text-yellow-400" /> : 
            <StarIcon className="w-5 h-5 text-gray-300" />
          }
        </button>
      </Link>
    </SwipeableItem>
  );
});

const SwipeableItem = React.memo(({ children, onArchive, onDelete }) => {
  return (
    <div className="relative bg-gray-100 overflow-hidden">
      {/* Background Actions */}
      <div className="absolute inset-0 flex justify-between">
        <button 
          onClick={onArchive}
          className="flex flex-col items-center justify-center w-24 bg-indigo-500 text-white transition-all hover:bg-indigo-600"
        >
          <ArchiveBoxIcon className="w-6 h-6 mb-1" />
          <span className="text-[10px] font-black uppercase tracking-tighter">Archive</span>
        </button>
        <button 
          onClick={onDelete}
          className="flex flex-col items-center justify-center w-24 bg-red-500 text-white transition-all hover:bg-red-600"
        >
          <TrashIcon className="w-6 h-6 mb-1" />
          <span className="text-[10px] font-black uppercase tracking-tighter">Delete</span>
        </button>
      </div>

      <motion.div
        drag="x"
        dragConstraints={{ left: -96, right: 96 }}
        dragElastic={0.05}
        onDragEnd={(e, info) => {
          if (info.offset.x < -80) onDelete(e);
          if (info.offset.x > 80) onArchive(e);
        }}
        className="relative bg-white z-10"
      >
        {children}
      </motion.div>
    </div>
  );
});
