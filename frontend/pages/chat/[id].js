import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Link from 'next/link';
import ChatBox from '../../components/ChatBox';
import { chatAPI } from '../../services/api';
import { initSocket, joinConversation, leaveConversation } from '../../services/socket';
import { KeepAwake } from '@capacitor-community/keep-awake';
import { 
  ArrowLeftIcon, 
  EllipsisVerticalIcon, 
  VideoCameraIcon, 
  PhoneIcon,
  TrashIcon,
  CalendarDaysIcon,
  LinkIcon,
  XMarkIcon,
  PhotoIcon
} from '@heroicons/react/24/outline';
import { getCurrentUser, getInitials, getAvatarColor, getFullFileUrl } from '../../utils/helpers';
import { useCall } from '../../context/CallContext';
import { sendMessage as sendSocketMessage } from '../../services/socket';
import { SharedMediaGallery } from '../../components/ChatMedia';

export default function ChatPage() {
  const router = useRouter();
  const { id } = router.query;
  const [conversation, setConversation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showMediaGallery, setShowMediaGallery] = useState(false);
  const [imgError, setImgError] = useState(false);
  
  const { callUser } = useCall();

  useEffect(() => {
    let wakeLock = null;

    const enableKeepAwake = async () => {
      try {
        if (typeof window !== 'undefined' && window.capacitor) {
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
            setLoading(false); // Disable spinner immediately
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
      if (socket) {
        socket.on('user-status-changed', (data) => {
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
        });
      }

      return () => {
        leaveConversation(id);
        if (socket) socket.off('user-status-changed');
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
    if (window.confirm('Are you sure you want to clear all messages? This cannot be undone.')) {
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
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#f0f2ff' }}>
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin"></div>
          <p className="mt-4 text-slate-500 font-medium">Connecting to chat...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>{name} | Campus Chat</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      </Head>

      <div className="max-w-xl mx-auto h-screen overflow-hidden flex flex-col shadow-2xl relative bg-app">
        {/* Header - Blue Gradient */}
        <header
          className="z-10 px-4 pt-[max(env(safe-area-inset-top,0px),16px)] pb-4 flex items-center justify-between bg-header-gradient shrink-0"
        >
          {/* Left: back + avatar + name */}
          <div className="flex items-center space-x-3 min-w-0">
            <Link
              href="/"
              className="p-2 -ml-1 text-white/80 hover:text-white transition-colors"
            >
              <ArrowLeftIcon className="w-5 h-5 stroke-[2.5px]" />
            </Link>

              <div
                className="flex items-center space-x-3 cursor-pointer min-w-0"
                onClick={() => {
                  if (otherParticipant?.user?.role === 'NANA') {
                    router.push('/nana');
                  } else {
                    setShowProfile(true);
                  }
                }}
              >
              <div className="relative">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold overflow-hidden ring-2 ring-white/30 bg-white/20`}>
                  {(() => {
                    const avatar = otherParticipant?.user?.avatar;
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
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 border-2 border-white rounded-full transition-all"></span>
                )}
              </div>

              <div className="min-w-0">
                <h1 className="font-bold text-white truncate text-[15px] leading-tight">
                  {name}
                </h1>
                <p className="text-[11px] text-white/70 font-medium">
                  {isOnline ? 'Online' : 'Offline'}
                </p>
              </div>
            </div>
          </div>

          {/* Right: call buttons */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleStartCall('VOICE')}
              disabled={!otherParticipant}
              className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-all disabled:opacity-30"
            >
              <PhoneIcon className="w-4.5 h-4.5" style={{ width: '18px', height: '18px'}} />
            </button>
            <button
              onClick={() => handleStartCall('VIDEO')}
              disabled={!otherParticipant}
              className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-all disabled:opacity-30"
            >
              <VideoCameraIcon className="w-4.5 h-4.5" style={{ width: '18px', height: '18px'}} />
            </button>
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-all"
              >
                <EllipsisVerticalIcon className="w-4.5 h-4.5" style={{ width: '18px', height: '18px'}} />
              </button>

              {showMenu && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowMenu(false)}
                  />
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden">
                    <div className="p-2 border-b border-slate-50">
                      <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Conversation Options
                      </div>
                    </div>
                    <div className="p-2 space-y-1">
                      <button
                        onClick={() => { setShowMediaGallery(true); setShowMenu(false); }}
                        className="w-full flex items-center space-x-3 px-3 py-2.5 text-sm font-bold text-slate-700 hover:bg-primary-50 hover:text-primary-600 rounded-xl transition-all text-left"
                      >
                        <PhotoIcon className="w-4 h-4" />
                        <span>View Media & Files</span>
                      </button>
                      <button
                        onClick={handleSendCallLink}
                        className="w-full flex items-center space-x-3 px-3 py-2.5 text-sm font-bold text-slate-700 hover:bg-primary-50 hover:text-primary-600 rounded-xl transition-all text-left"
                      >
                        <LinkIcon className="w-4 h-4" />
                        <span>Send Call Link</span>
                      </button>
                      <button
                        onClick={handleScheduleCall}
                        className="w-full flex items-center space-x-3 px-3 py-2.5 text-sm font-bold text-slate-700 hover:bg-primary-50 hover:text-primary-600 rounded-xl transition-all text-left"
                      >
                        <CalendarDaysIcon className="w-4 h-4" />
                        <span>Schedule Call</span>
                      </button>
                      <div className="h-px bg-slate-50 my-1 mx-2" />
                      <button
                        onClick={handleClearChat}
                        className="w-full flex items-center space-x-3 px-3 py-2.5 text-sm font-bold text-red-500 hover:bg-red-50 rounded-xl transition-all text-left"
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
        </header>

        {/* Chat Component */}
        <ChatBox conversationId={id} />
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
          <div className="fixed inset-y-0 right-0 w-full max-w-sm bg-white shadow-2xl z-[99999] flex flex-col border-l border-slate-100">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
                <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">Contact Info</h2>
                <button onClick={() => setShowProfile(false)} className="p-2 bg-white rounded-full text-slate-400 hover:text-slate-600 shadow-sm border border-slate-100 transition-all hover:scale-105">
                  <XMarkIcon className="w-5 h-5 stroke-[3px]" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-8 flex flex-col items-center">
                {/* Giant Avatar */}
                <div className="relative mb-6 group">
                  <div className={`w-32 h-32 rounded-3xl flex items-center justify-center text-white text-5xl font-black shadow-xl shadow-primary-500/20 ring-4 ring-white overflow-hidden bg-slate-100`}>
                    {(() => {
                      const avatar = otherParticipant?.user?.avatar;
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
                      <span className="w-2.5 h-2.5 bg-white rounded-full animate-pulse px-0"></span>
                    </div>
                  )}
                </div>

                {/* Name & Status */}
                <h1 className="text-2xl font-black text-slate-800 tracking-tight text-center">{name}</h1>
                {otherParticipant?.user?.status && (
                  <div className="mt-1 px-3 py-1 bg-slate-50 border border-slate-100 rounded-lg">
                    <p className="text-[11px] font-black text-slate-500 italic uppercase">
                      "{otherParticipant.user.status}"
                    </p>
                  </div>
                )}
                <p className={`text-sm font-bold uppercase tracking-widest mt-3 ${isOnline ? 'text-green-500' : 'text-slate-400'}`}>
                  {isOnline ? 'Active Now' : 'Offline'}
                </p>

                {/* Quick Actions Card */}
                <div className="w-full bg-slate-50 rounded-2xl p-4 mt-8 flex justify-around border border-slate-100">
                  <button onClick={() => { setShowProfile(false); handleStartCall('VOICE'); }} className="flex flex-col items-center space-y-2 group">
                    <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-primary-500 group-hover:bg-primary-50 group-hover:text-primary-600 transition-all">
                      <PhoneIcon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-primary-500">Audio</span>
                  </button>
                  <button onClick={() => { setShowProfile(false); handleStartCall('VIDEO'); }} className="flex flex-col items-center space-y-2 group">
                    <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-emerald-500 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-all">
                      <VideoCameraIcon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-emerald-500">Video</span>
                  </button>
                </div>
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
          <div className="fixed inset-y-0 right-0 w-full max-w-sm bg-white shadow-2xl z-[99999] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">Shared Media</h2>
              <button onClick={() => setShowMediaGallery(false)} className="p-2 text-slate-400 hover:text-slate-600">
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
