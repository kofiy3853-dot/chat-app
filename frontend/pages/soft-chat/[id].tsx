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
import { getSocket, joinConversation, leaveConversation, sendMessage as sendSocketMessage } from '../../services/socket';
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

      const socket = getSocket();
      if (socket) {
        socket.on('new-message', (data: any) => {
          if (data.conversationId === id) {
            setMessages(prev => [...prev, data.message]);
          }
        });
      }

      return () => {
        leaveConversation(id as string);
        const socket = getSocket();
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
    <div className="flex flex-col h-screen max-w-xl mx-auto bg-soft-bg relative overflow-hidden shadow-2xl">
      <Head>
        <title>{name} | Campus Chat</title>
      </Head>

      {/* Header */}
      <header className="bg-soft-gradient px-4 pt-10 pb-6 text-white rounded-b-[24px] z-10 shadow-lg shadow-indigo-500/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => router.back()} 
              aria-label="Go back"
              className="p-2 -ml-2 hover:bg-white/10 rounded-2xl transition-all"
            >
              <ArrowLeftIcon className="w-6 h-6 stroke-[2.5px]" />
            </button>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20 overflow-hidden shadow-sm">
                {otherParticipant?.user?.avatar ? (
                  <img src={getFullFileUrl(otherParticipant.user.avatar)} className="w-full h-full object-cover" alt="" />
                ) : (
                  <span className="text-sm font-black">{getInitials(name)}</span>
                )}
              </div>
              <div>
                <h1 className="font-black text-sm tracking-tight leading-none truncate max-w-[120px]">{name}</h1>
                <p className="text-[10px] font-black uppercase tracking-widest mt-0.5 opacity-80">
                  {isOnline ? 'Online' : 'Offline'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button aria-label="Audio call" className="p-2.5 bg-white/10 hover:bg-white/20 rounded-2xl transition-all">
              <PhoneIcon className="w-5 h-5" />
            </button>
            <button aria-label="Video call" className="p-2.5 bg-white/10 hover:bg-white/20 rounded-2xl transition-all">
              <VideoCameraIcon className="w-5 h-5" />
            </button>
            <button aria-label="More options" className="p-2.5 bg-white/10 hover:bg-white/20 rounded-2xl transition-all">
              <EllipsisVerticalIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Message List */}
      <div className="flex-1 min-h-0 bg-[#f5f7fb]">
        <SoftMessageList messages={messages} currentUser={currentUser} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white/80 backdrop-blur-xl border-t border-slate-50 relative bottom-0">
        <div className="flex items-center space-x-3 bg-slate-50 p-2 rounded-soft shadow-soft">
          <button aria-label="Attach file" className="p-3 text-soft-text-secondary hover:text-soft-primary bg-white rounded-2xl shadow-sm transition-all active:scale-95">
            <PaperClipIcon className="w-5 h-5" />
          </button>
          <input 
            type="text" 
            placeholder="Write a message..." 
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            className="flex-1 bg-transparent border-none outline-none text-soft-text-primary px-2 font-medium text-sm"
          />
          <button aria-label="Voice message" className="p-3 text-soft-text-secondary hover:text-soft-primary pr-1">
             <MicrophoneIcon className="w-5 h-5" />
          </button>
          <button 
            onClick={handleSendMessage}
            aria-label="Send message"
            className="p-3.5 bg-soft-gradient text-white rounded-full shadow-lg shadow-indigo-500/30 active:scale-90 transition-all"
          >
            <PaperAirplaneIcon className="w-6 h-6 -rotate-45" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatConversationPage;
