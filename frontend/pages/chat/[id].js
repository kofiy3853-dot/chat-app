import { useEffect, useState } from 'react';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import { chatAPI } from '../../services/api';

// Heavy components — load only when needed (code split)
const ChatBox = dynamic(() => import('../../components/ChatBox'), { ssr: false });
const ChatHeader = dynamic(() => import('../../components/ChatHeader'), { ssr: false });
import { initSocket, joinConversation, leaveConversation } from '../../services/socket';
import { getCurrentUser, getFullFileUrl } from '../../utils/helpers';
import { useCall } from '../../context/CallContext';
import { sendMessage as sendSocketMessage } from '../../services/socket';
const SharedMediaGallery = dynamic(() => import('../../components/ChatMedia').then(m => ({ default: m.SharedMediaGallery })), { ssr: false });

export default function ChatPage() {
  const router = useRouter();
  const { id } = router.query;
  const [conversation, setConversation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
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

        <ChatHeader
          conversation={conversation}
          otherParticipant={otherParticipant}
          name={name}
          isOnline={isOnline}
          typingUsers={typingUsers}
          showSearch={showSearch}
          setShowSearch={setShowSearch}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          setShowProfile={setShowProfile}
          handleStartCall={handleStartCall}
          handleSendCallLink={handleSendCallLink}
          handleScheduleCall={handleScheduleCall}
          handleClearChat={handleClearChat}
          setShowMediaGallery={setShowMediaGallery}
        />

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
            className="fixed inset-0 bg-slate-900/40 z-[99998]"
          />
          {/* Sliding Drawer */}
          <div className="fixed inset-y-0 right-0 w-full max-w-sm bg-surface z-[99999] flex flex-col border-l border-[var(--divider)]">
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
                {/* Status hidden as requested
                {otherParticipant?.user?.status && (
                  <div className="mt-1 px-3 py-1 bg-app border border-[var(--divider)] rounded-lg">
                    <p className="text-[11px] font-black text-app-secondary italic uppercase">
                      "{otherParticipant.user.status}"
                    </p>
                  </div>
                )}
                */}
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
            className="fixed inset-0 bg-slate-900/40 z-[99998]"
          />
          <div className="fixed inset-y-0 right-0 w-full max-w-sm bg-surface z-[99999] flex flex-col">
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
