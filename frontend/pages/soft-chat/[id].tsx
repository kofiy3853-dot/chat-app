import React, { useState, useEffect, useRef, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { 
  ArrowLeftIcon, 
  PhoneIcon, 
  VideoCameraIcon, 
  EllipsisVerticalIcon, 
  PaperClipIcon, 
  PaperAirplaneIcon,
  MicrophoneIcon
} from '@heroicons/react/24/outline';
import { chatAPI } from '../../services/api';
import { initSocket, joinConversation, leaveConversation, sendMessage as sendSocketMessage } from '../../services/socket';
import { getCurrentUser, getInitials, getAvatarColor, getFullFileUrl } from '../../utils/helpers';
import SoftMessageList from '../../components/SoftMessageList';

const ChatConversationPage: React.FC = () => {
  const router = useRouter();
  const { id } = router.query;
  const [conversation, setConversation] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    setCurrentUser(getCurrentUser());
  }, []);

  useEffect(() => {
    if (id) {
      setLoading(true);
      fetchConversation();
      fetchMessages();
      joinConversation(id as string);

      const socket = initSocket();
      if (socket) {
        socket.on('new-message', (data: any) => {
          if (data.conversationId === id) {
            setMessages((prev: any[]) => [...prev, data.message]);
          }
        });
      }

      return () => {
        leaveConversation(id as string);
        if (socket) socket.off('new-message');
      };
    }
  }, [id]);

  const fetchConversation = async () => {
    try {
      const response = await chatAPI.getConversationById(id as string);
      setConversation(response.data.conversation);
    } catch (err) {
      console.error('Fetch conversation error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    try {
      const response = await chatAPI.getMessages(id as string);
      setMessages(response.data.messages || []);
    } catch (err) {
      console.error('Fetch messages error:', err);
    }
  };

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    
    sendSocketMessage({
      conversationId: id,
      content: newMessage,
      type: 'TEXT'
    });
    setNewMessage('');
  };

  const otherParticipant = conversation?.participants?.find(
    (p: any) => p.userId !== currentUser?.id
  );

  const name = conversation?.name || otherParticipant?.user?.name || 'Chat';
  const isOnline = otherParticipant?.user?.isOnline;

  if (loading || !currentUser) return null;

  return (
    <div className="flex flex-col h-screen max-w-xl mx-auto bg-[#F5F8FF] relative overflow-hidden font-sans">
      <Head>
        <title>{name} | Campus Chat</title>
      </Head>

      {/* ─── Premium Island Header ─── */}
      <header className="px-5 pt-10 pb-6 z-20">
        <div className="bg-header-gradient rounded-[32px] p-4 flex items-center justify-between shadow-lg shadow-primary-500/10">
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => router.back()} 
              aria-label="Go back"
              className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center text-white active:"
            >
              <ArrowLeftIcon className="w-5 h-5 stroke-[3px]" />
            </button>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20 overflow-hidden">
                {otherParticipant?.user?.avatar ? (
                  <img src={getFullFileUrl(otherParticipant.user.avatar)} className="w-full h-full object-cover" alt="" />
                ) : (
                  <span className="text-sm font-black text-white">{getInitials(name)}</span>
                )}
              </div>
              <div>
                <h1 className="font-black text-[15px] tracking-tight text-white leading-none mb-1">{name}</h1>
                <div className="flex items-center space-x-1.5">
                   <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-green-400 ' : 'bg-white/30'}`} />
                   <p className="text-[10px] font-black uppercase tracking-widest text-white/70">
                    {isOnline ? 'Online' : 'Offline'}
                   </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button aria-label="Audio call" className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center text-white active:">
              <PhoneIcon className="w-5 h-5 fill-white/10" />
            </button>
            <button aria-label="Video call" className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center text-white active:">
              <VideoCameraIcon className="w-5 h-5 fill-white/10" />
            </button>
          </div>
        </div>
      </header>

      {/* ─── Message List (Virtualized) ─── */}
      <main className="flex-1 min-h-0">
        <SoftMessageList messages={messages} currentUser={currentUser} />
      </main>

      {/* ─── Premium Floating Input ─── */}
      <footer className="px-6 pb-10 pt-4 z-20">
        <div className="bg-white rounded-[32px] p-2 flex items-center shadow-xl shadow-primary-900/5 hover:shadow-primary-900/10">
          <button aria-label="Media" className="w-11 h-11 flex items-center justify-center text-slate-300 hover:text-primary-500">
            <PaperClipIcon className="w-6 h-6" />
          </button>
          
          <input 
            type="text" 
            placeholder="Type Your Message..." 
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            className="flex-1 bg-transparent border-none outline-none text-[#1A1D3A] px-2 font-bold text-[14px] placeholder-slate-300"
          />
          
          <div className="flex items-center pr-1">
             <button aria-label="Voice" className="w-11 h-11 flex items-center justify-center text-slate-300 mr-1">
                <MicrophoneIcon className="w-6 h-6" />
             </button>
             <button 
               onClick={handleSendMessage}
               aria-label="Send"
               className="w-11 h-11 rounded-full bg-primary-500 flex items-center justify-center text-white shadow-lg shadow-primary-500/30 active:"
             >
               <PaperAirplaneIcon className="w-5 h-5 - relative left-[-1px]" />
             </button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ChatConversationPage;
