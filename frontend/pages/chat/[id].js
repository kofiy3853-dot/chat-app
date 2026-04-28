import { useEffect, useState } from 'react';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { chatAPI } from '../../services/api';

// Heavy components — load only when needed (code split)
const ChatBox = dynamic(() => import('../../components/ChatBox'), { ssr: false });
import { initSocket, joinConversation, leaveConversation } from '../../services/socket';
import { 
  ArrowLeftIcon, 
  EllipsisVerticalIcon, 
  VideoCameraIcon, 
  PhoneIcon,
  TrashIcon,
  CalendarDaysIcon,
  LinkIcon,
  XMarkIcon,
  PhotoIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import { getCurrentUser, getInitials, getAvatarColor, getFullFileUrl } from '../../utils/helpers';
import { useCall } from '../../context/CallContext';
import { sendMessage as sendSocketMessage } from '../../services/socket';
import { formatDistanceToNow } from 'date-fns';
const SharedMediaGallery = dynamic(() => import('../../components/ChatMedia').then(m => ({ default: m.SharedMediaGallery })), { ssr: false });

export default function ChatPage() {
  const router = useRouter();
  const { id } = router.query;
  const [conversation, setConversation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showMediaGallery, setShowMediaGallery] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [imgError, setImgError] = useState(false);
  const [modalImgError, setModalImgError] = useState(false);
  const [messages, setMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  
  const { callUser } = useCall();

  useEffect(() => {
    let wakeLock = null;

    const enableKeepAwake = async () => {
      try {
        if (typeof window !== 'undefined' && window.capacitor) {
          const { KeepAwake } = await import('@capacitor-community/keep-awake');
          await KeepAwake.keepAwake();
        } else if ('wakeLock' in navigator) {
          wakeLock = await navigator.wakeLock.request('screen');
        }
      } catch (e) {
        console.log('KeepAwake error:', e);
      }
    };

    const disableKeepAwake = async () => {
      try {
        if (typeof window !== 'undefined' && window.capacitor) {
          const { KeepAwake } = await import('@capacitor-community/keep-awake');
          await KeepAwake.allowSleep();
        } else if (wakeLock) {
          await wakeLock.release();
          wakeLock = null;
        }
      } catch (e) {
        console.log('Release error:', e);
      }
    };

    const handleVisibilityChange = async () => {
      if (typeof window === 'undefined' || window.capacitor) return;
      if (document.visibilityState === 'visible' && 'wakeLock' in navigator && !wakeLock) {
        enableKeepAwake();
      }
    };

    enableKeepAwake();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      disableKeepAwake();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    setCurrentUser(getCurrentUser());
  }, []);

  useEffect(() => {
    if (id) {
      // --- CACHE-FIRST LOGIC (CONVERSATION) ---
      const cacheKey = `cached_conversation_${id}`;
      const savedConv = localStorage.getItem(cacheKey);
      
      if (savedConv) {
        try {
          const parsed = JSON.parse(savedConv);
          if (parsed && typeof parsed === 'object') {
            setConversation(parsed);
            setLoading(false);
          } else {
            setLoading(true);
          }
        } catch (e) {
          setLoading(true);
        }
      } else {
        setLoading(true);
      }
      
      fetchConversation();
      joinConversation(id);

      const socket = initSocket();

      const handleUserStatusChange = (data) => {
        setConversation(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            participants: prev.participants.map(p => 
              p.userId === data.userId 
                ? { ...p, user: { ...p.user, isOnline: data.isOnline, lastSeen: data.lastSeen, status: data.status ?? p.user.status } }
                : p
            )
          };
        });
      };

      const handleLockUpdated = ({ locked, courseId }) => {
        setConversation(prev => {
          if (prev?.id === courseId || prev?.course?.id === courseId) {
            return { ...prev, course: { ...prev.course, announcementsOnly: locked } };
          }
          return prev;
        });
      };

      if (socket) {
        socket.on('user-status-changed', handleUserStatusChange);
        socket.on('chat-lock-updated', handleLockUpdated);
        // NOTE: user-typing is handled entirely inside ChatBox.js — do NOT register a second listener here
      }

      return () => {
        leaveConversation(id);
        if (socket) {
          socket.off('user-status-changed', handleUserStatusChange);
          socket.off('chat-lock-updated', handleLockUpdated);
        }
      };
    }
  }, [id]);

  const fetchConversation = async () => {
    try {
      const response = await chatAPI.getConversationById(id);
      const conv = response.data.conversation;
      if (conv) {
        setConversation(conv);
        localStorage.setItem(`cached_conversation_${id}`, JSON.stringify(conv));
      }
    } catch (error) {
      console.error('Failed to fetch conversation:', error);
    } finally {
      setLoading(false);
    }
  };

  const otherParticipant = conversation?.participants?.find(
    p => p.userId !== currentUser?.id
  );

  const name = conversation?.name || otherParticipant?.user?.name || 'Chat';
  const isOnline = otherParticipant?.user?.isOnline;

  const handleStartCall = (type) => {
    if (otherParticipant?.user?.id) {
      callUser(otherParticipant.user.id, otherParticipant.user.name, type);
    }
  };

  const handleClearChat = async () => {
    if (window.confirm('Clear your chat history? This will only remove messages from your view and cannot be undone.')) {
      try {
        await chatAPI.clearChat(id);
        setShowMenu(false);
      } catch (error) {
        console.error('Failed to clear chat:', error);
        alert('Could not clear chat. Please try again.');
      }
    }
  };

  const handleSendCallLink = () => {
    const callLink = `https://campus-chat.com/call/${id}-${Math.random().toString(36).substring(7)}`;
    sendSocketMessage({
      conversationId: id,
      content: `Let's have a quick call! Join here: ${callLink}`,
      type: 'TEXT'
    });
    setShowMenu(false);
  };

  const handleScheduleCall = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    
    sendSocketMessage({
      conversationId: id,
      content: `🗓️ Scheduled a call for tomorrow at ${tomorrow.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      type: 'TEXT'
    });
    setShowMenu(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-app">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-primary-100 border-t-primary-600 rounded-full"></div>
          <p className="mt-4 text-app-secondary font-black uppercase tracking-widest text-[10px]">Connecting to chat...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col h-[100dvh] bg-page relative overflow-hidden w-full max-w-xl mx-auto">
        <Head>
          <title>{name} | Campus Chat</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
        </Head>

        <header
          className="w-full z-[100] flex flex-col border-b shrink-0"
          style={{ background: 'var(--bg-navbar)', color: 'var(--text-navbar)', borderColor: 'var(--border)' }}
        >
          <div className="flex items-center justify-between px-3 pt-[max(env(safe-area-inset-top,0px),4px)] pb-1 min-h-[48px]">
          {/* Left: back + avatar + name */}
          <div className="flex items-center space-x-3 min-w-0">
            <Link
              href="/"
              className="p-2 -ml-1"
              style={{ color: 'color-mix(in srgb, var(--text-navbar), transparent 20%)' }}
            >
              <ArrowLeftIcon className="w-5 h-5 stroke-[2.5px]" />
            </Link>

              <div
                className="flex items-center space-x-3 cursor-pointer min-w-0"
                onClick={() => setShowProfile(true)}
              >
              <div className="relative">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold overflow-hidden ring-2 ring-white/30"
                  style={{ 
                    background: otherParticipant?.user?.role === 'NANA' ? 'linear-gradient(to top right, var(--primary), var(--indigo))' : 'rgba(255,255,255,0.2)',
                    color: '#ffffff'
                  }}
                >
                  {(() => {
                    const isNana = otherParticipant?.user?.role === 'NANA';
                    if (isNana) return 'N';
                    const avatar = conversation?.avatar || otherParticipant?.user?.avatar;
                    const fullUrl = getFullFileUrl(avatar);
                    return (
                      <>
                        {fullUrl && !imgError ? (
                          <img 
                            src={fullUrl} 
                            className="w-full h-full object-cover rounded-full" 
                            alt="" 
                            onError={() => setImgError(true)}
                          />
                        ) : (
                          <div className={`w-full h-full rounded-full bg-gradient-to-tr ${getAvatarColor(name)} flex items-center justify-center`}>
                            {getInitials(name)}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
                {isOnline && (
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 border-2 border-white rounded-full"></span>
                )}
              </div>

              <div className="min-w-0">
                <h1 className="font-bold truncate text-[15px] leading-tight flex items-center" style={{ color: 'var(--text-navbar)' }}>
                  {name}
                  {conversation?.course?.announcementsOnly && (
                    <span className="ml-2 px-1.5 py-0.5 bg-surface/20 rounded text-[8px] font-black tracking-widest uppercase border border-white/10" style={{ color: 'var(--text-navbar)' }}>
                      Announcements
                    </span>
                  )}
                </h1>
                <p className="text-[11px] font-medium flex items-center" style={{ color: 'color-mix(in srgb, var(--text-navbar), transparent 30%)' }}>
                  {conversation?.course?.announcementsOnly ? (
                    <span className="flex items-center">
                      <div className="w-1.5 h-1.5 bg-rose-400 rounded-full mr-1.5" />
                      Locked by Lecturer
                    </span>
                  ) : (
                    typingUsers.length > 0 ? (
                      <span className="text-primary-400 font-bold">
                        {typingUsers.length === 1 ? 'typing...' : 'several people typing...'}
                      </span>
                    ) : (
                      isOnline ? 'Online' : (
                        otherParticipant?.user?.lastSeen ? (
                          `Last seen ${formatDistanceToNow(new Date(otherParticipant.user.lastSeen), { addSuffix: true })}`
                        ) : 'Offline'
                      )
                    )
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Right: call buttons */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowSearch(!showSearch)}
              className={`w-9 h-9 rounded-full flex items-center justify-center  ${showSearch ? 'bg-black/10' : 'bg-black/5 hover:bg-black/10'}`}
              style={{ color: 'var(--text-navbar)' }}
            >
              <MagnifyingGlassIcon className="w-4.5 h-4.5" style={{ width: '18px', height: '18px'}} />
            </button>
            <button
              onClick={() => handleStartCall('VOICE')}
              disabled={!otherParticipant}
              className="w-9 h-9 rounded-full bg-black/5 flex items-center justify-center hover:bg-black/10 disabled:opacity-30"
              style={{ color: 'var(--text-navbar)' }}
            >
              <PhoneIcon className="w-4.5 h-4.5" style={{ width: '18px', height: '18px'}} />
            </button>
            <button
              onClick={() => handleStartCall('VIDEO')}
              disabled={!otherParticipant}
              className="w-9 h-9 rounded-full bg-black/5 flex items-center justify-center hover:bg-black/10 disabled:opacity-30"
              style={{ color: 'var(--text-navbar)' }}
            >
              <VideoCameraIcon className="w-4.5 h-4.5" style={{ width: '18px', height: '18px'}} />
            </button>
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="w-9 h-9 rounded-full bg-black/5 flex items-center justify-center hover:bg-black/10"
                style={{ color: 'var(--text-navbar)' }}
              >
                <EllipsisVerticalIcon className="w-4.5 h-4.5" style={{ width: '18px', height: '18px'}} />
              </button>

              {showMenu && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowMenu(false)}
                  />
                  <div className="absolute right-0 mt-2 w-56 bg-surface rounded-2xl shadow-2xl border border-[var(--divider)] z-50 overflow-hidden">
                    <div className="p-2 border-b border-slate-50">
                      <div className="px-3 py-2 text-[10px] font-bold text-app-muted uppercase tracking-widest">
                        Conversation Options
                      </div>
                    </div>
                    <div className="p-2 space-y-1">
                      <button
                        onClick={() => { setShowMediaGallery(true); setShowMenu(false); }}
                        className="w-full flex items-center space-x-3 px-3 py-2.5 text-sm font-bold text-slate-700 hover:bg-primary-50 hover:text-primary-600 rounded-xl text-left"
                      >
                        <PhotoIcon className="w-4 h-4" />
                        <span>View Media & Files</span>
                      </button>
                      <button
                        onClick={handleSendCallLink}
                        className="w-full flex items-center space-x-3 px-3 py-2.5 text-sm font-bold text-slate-700 hover:bg-primary-50 hover:text-primary-600 rounded-xl text-left"
                      >
                        <LinkIcon className="w-4 h-4" />
                        <span>Send Call Link</span>
                      </button>
                      <button
                        onClick={handleScheduleCall}
                        className="w-full flex items-center space-x-3 px-3 py-2.5 text-sm font-bold text-slate-700 hover:bg-primary-50 hover:text-primary-600 rounded-xl text-left"
                      >
                        <CalendarDaysIcon className="w-4 h-4" />
                        <span>Schedule Call</span>
                      </button>
                      <div className="h-px bg-app my-1 mx-2" />
                      <button
                        onClick={handleClearChat}
                        className="w-full flex items-center space-x-3 px-3 py-2.5 text-sm font-bold text-red-500 hover:bg-red-50 rounded-xl text-left"
                      >
                        <TrashIcon className="w-4 h-4" />
                        <span>Clear All Chat</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
        {showSearch && (
            <div className="w-full bg-page border-t border-[var(--border)]/50 px-4 py-2 flex items-center shadow-sm" style={{ background: 'var(--bg-page)', borderColor: 'var(--border)' }}>
               <input 
                 autoFocus 
                 value={searchQuery} 
                 onChange={e => setSearchQuery(e.target.value)} 
                 placeholder="Search in conversation..." 
                 className="w-full rounded-2xl py-2 px-4 text-sm outline-none border focus:ring-2 focus:ring-primary-500/20"
                 style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)', borderColor: 'var(--border)' }}
               />
               <button onClick={() => { setShowSearch(false); setSearchQuery(''); }} className="ml-2 p-1.5 rounded-full hover:bg-black/5 text-app-secondary flex-shrink-0">
                  <XMarkIcon className="w-5 h-5" />
               </button>
            </div>
          )}
        </header>

        {/* Chat Component */}
        <ChatBox 
          conversationId={id} 
          onMessagesUpdate={setMessages} 
          searchQuery={searchQuery} 
          participants={conversation?.participants || []} 
        />
      </div>

      {/* Participant Profile Modal */}
      {showProfile && otherParticipant && (
        <>
          {/* Dark Backdrop */}
          <div
            onClick={() => setShowProfile(false)}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[99998]"
          />
          {/* Sliding Drawer */}
          <div className="fixed inset-y-0 right-0 w-full max-w-sm bg-surface shadow-2xl z-[99999] flex flex-col border-l border-[var(--divider)]">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-[var(--divider)] bg-app/50">
                <h2 className="text-sm font-black text-app-primary uppercase tracking-widest">Contact Info</h2>
                <button onClick={() => setShowProfile(false)} className="p-2 bg-surface rounded-full text-app-muted hover:text-slate-600 shadow-sm border border-[var(--divider)] hover:">
                  <XMarkIcon className="w-5 h-5 stroke-[3px]" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-8 flex flex-col items-center">
                {/* Giant Avatar */}
                <div className="relative mb-6 group">
                  <div className={`w-32 h-32 rounded-3xl flex items-center justify-center text-white text-5xl font-black shadow-xl shadow-primary-500/20 ring-4 ring-white overflow-hidden bg-surface-2 ${otherParticipant?.user?.role === 'NANA' ? 'bg-gradient-to-tr from-primary-500 to-indigo-600' : ''}`}>
                    {(() => {
                      if (otherParticipant?.user?.role === 'NANA') return <div className="text-white">N</div>;
                      const avatar = conversation?.avatar || otherParticipant?.user?.avatar;
                      const fullUrl = getFullFileUrl(avatar);
                      return (
                        <>
                          {fullUrl && !modalImgError ? (
                            <img 
                              src={fullUrl} 
                              className="w-full h-full object-cover" 
                              alt="" 
                              onError={() => setModalImgError(true)}
                            />
                          ) : (
                            <div className={`w-full h-full bg-gradient-to-tr ${getAvatarColor(name)} flex items-center justify-center`}>
                              {getInitials(name)}
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                  {isOnline && (
                    <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-500 border-4 border-white rounded-full shadow-lg flex items-center justify-center">
                      <span className="w-2.5 h-2.5 bg-surface rounded-full px-0"></span>
                    </div>
                  )}
                </div>

                {/* Name & Status */}
                <h1 className="text-2xl font-black text-app-primary tracking-tight text-center">{name}</h1>
                {otherParticipant?.user?.status && (
                  <div className="mt-1 px-3 py-1 bg-app border border-[var(--divider)] rounded-lg">
                    <p className="text-[11px] font-black text-app-secondary italic uppercase">
                      "{otherParticipant.user.status}"
                    </p>
                  </div>
                )}
                <p className={`text-sm font-bold uppercase tracking-widest mt-3 ${isOnline ? 'text-green-500' : 'text-app-muted'}`}>
                  {isOnline ? 'Active Now' : 'Offline'}
                </p>

                {/* Quick Actions Card */}
                {otherParticipant?.user?.role !== 'NANA' && (
                  <div className="w-full bg-app rounded-2xl p-4 mt-8 flex justify-around border border-[var(--divider)]">
                    <button onClick={() => { setShowProfile(false); handleStartCall('VOICE'); }} className="flex flex-col items-center space-y-2 group">
                      <div className="w-12 h-12 rounded-2xl bg-surface flex items-center justify-center text-primary-500 group-hover:bg-primary-50 group-hover:text-primary-600 border border-[var(--divider)]">
                        <PhoneIcon className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-app-muted group-hover:text-primary-500">Audio</span>
                    </button>
                    <button onClick={() => { setShowProfile(false); handleStartCall('VIDEO'); }} className="flex flex-col items-center space-y-2 group">
                      <div className="w-12 h-12 rounded-2xl bg-surface flex items-center justify-center text-emerald-500 group-hover:bg-emerald-50 group-hover:text-emerald-600 border border-[var(--divider)]">
                        <VideoCameraIcon className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-app-muted group-hover:text-emerald-500">Video</span>
                    </button>
                  </div>
                )}
              </div>
          </div>
        </>
      )}

      {/* Shared Media Gallery Drawer */}
      {showMediaGallery && (
        <>
          <div
            onClick={() => setShowMediaGallery(false)}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[99998]"
          />
          <div className="fixed inset-y-0 right-0 w-full max-w-sm bg-surface shadow-2xl z-[99999] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-[var(--divider)]">
              <h2 className="text-sm font-black text-app-primary uppercase tracking-widest">Shared Media</h2>
              <button onClick={() => setShowMediaGallery(false)} className="p-2 text-app-muted hover:text-slate-600">
                <XMarkIcon className="w-5 h-5 stroke-[2px]" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <SharedMediaGallery messages={messages} />
            </div>
          </div>
        </>
      )}

      <style jsx global>{`
        /* Hide scrollbar for Chrome, Safari and Opera */
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }

        /* Hide scrollbar for IE, Edge and Firefox */
        .scrollbar-hide {
          -ms-overflow-style: none; /* IE and Edge */
          scrollbar-width: none; /* Firefox */
        }
      `}</style>
    </>
  );
}
