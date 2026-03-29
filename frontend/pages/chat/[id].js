import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Link from 'next/link';
import ChatBox from '../../components/ChatBox';
import { chatAPI } from '../../services/api';
import { joinConversation, leaveConversation } from '../../services/socket';
import { KeepAwake } from '@capacitor-community/keep-awake';
import { 
  ArrowLeftIcon, 
  EllipsisVerticalIcon, 
  VideoCameraIcon, 
  PhoneIcon,
  TrashIcon,
  CalendarDaysIcon,
  LinkIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { getCurrentUser, getInitials, getAvatarColor } from '../../utils/helpers';
import { motion, AnimatePresence } from 'framer-motion';
import { useCall } from '../../context/CallContext';
import { sendMessage as sendSocketMessage } from '../../services/socket';

export default function ChatPage() {
  const router = useRouter();
  const { id } = router.query;
  const [conversation, setConversation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  
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
      setLoading(true);
      fetchConversation();
      joinConversation(id);

      return () => {
        leaveConversation(id);
      };
    }
  }, [id]);

  const fetchConversation = async () => {
    try {
      const response = await chatAPI.getConversationById(id);
      if (response.data.conversation) {
        setConversation(response.data.conversation);
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
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-primary-100 border-t-primary-600 rounded-full animate-spin"></div>
          <p className="mt-4 text-slate-500 font-medium">Connecting to chat...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>{name} | Campus Chat</title>
      </Head>

      <div className="max-w-xl mx-auto min-h-screen flex flex-col bg-white shadow-2xl relative">
        {/* Header */}
        <motion.header 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="sticky top-0 bg-white/95 backdrop-blur-xl border-b border-slate-100 px-4 py-3 z-[10] flex items-center justify-between"
        >
          <div className="flex items-center space-x-3 min-w-0">
            <Link 
              href="/"
              className="p-2 -ml-2 hover:bg-slate-50 text-slate-400 hover:text-slate-600 rounded-2xl transition-all"
            >
              <ArrowLeftIcon className="w-5 h-5 stroke-[2.5px]" />
            </Link>
            
            <div 
              className="flex items-center space-x-3 cursor-pointer group min-w-0"
              onClick={() => setShowProfile(true)}
            >
              <div className="relative group">
                <div className={`w-10 h-10 rounded-[14px] bg-gradient-to-tr ${getAvatarColor(name)} flex items-center justify-center text-white text-sm font-bold shadow-md group-hover:scale-105 transition-all duration-300`}>
                  {getInitials(name)}
                </div>
                {isOnline && (
                  <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"></span>
                )}
              </div>
              
              <div className="min-w-0">
                <h1 className="font-extrabold text-slate-800 truncate text-sm sm:text-base tracking-tight leading-none group-hover:text-primary-600 transition-colors">
                  {name}
                </h1>
                <div className="flex items-center space-x-1.5 mt-1">
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${isOnline ? 'text-green-500' : 'text-slate-400'}`}>
                    {isOnline ? 'Active Now' : 'Offline'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-1 sm:space-x-2">
            <button 
              onClick={() => handleStartCall('VOICE')}
              disabled={!otherParticipant}
              className="flex p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-all disabled:opacity-30"
            >
              <PhoneIcon className="w-5 h-5" />
            </button>
            <button 
              onClick={() => handleStartCall('VIDEO')}
              disabled={!otherParticipant}
              className="flex p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-all disabled:opacity-30"
            >
              <VideoCameraIcon className="w-5 h-5" />
            </button>
            <div className="relative">
              <button 
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all"
              >
                <EllipsisVerticalIcon className="w-5 h-5" />
              </button>

              <AnimatePresence>
                {showMenu && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setShowMenu(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 10 }}
                      className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden"
                    >
                      <div className="p-2 border-b border-slate-50">
                        <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          Conversation Options
                        </div>
                      </div>
                      <div className="p-2 space-y-1">
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
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.header>

        {/* Chat Component */}
        <ChatBox conversationId={id} />
      </div>

      {/* Participant Profile Modal */}
      <AnimatePresence>
        {showProfile && otherParticipant && (
          <>
            {/* Dark Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowProfile(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[99998]"
            />
            {/* Sliding Drawer */}
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 w-full max-w-sm bg-white shadow-2xl z-[99999] flex flex-col border-l border-slate-100"
            >
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
                  <div className={`w-32 h-32 rounded-3xl bg-gradient-to-tr ${getAvatarColor(name)} flex items-center justify-center text-white text-5xl font-black shadow-xl shadow-primary-500/20 ring-4 ring-white`}>
                    {getInitials(name)}
                  </div>
                  {isOnline && (
                    <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-500 border-4 border-white rounded-full shadow-lg flex items-center justify-center">
                      <span className="w-2.5 h-2.5 bg-white rounded-full animate-pulse px-0"></span>
                    </div>
                  )}
                </div>

                {/* Name & Status */}
                <h1 className="text-2xl font-black text-slate-800 tracking-tight text-center">{name}</h1>
                <p className={`text-sm font-bold uppercase tracking-widest mt-2 ${isOnline ? 'text-green-500' : 'text-slate-400'}`}>
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
            </motion.div>
          </>
        )}
      </AnimatePresence>

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
