import { useEffect, useState, useRef, useMemo } from 'react';
import { format, isToday, isYesterday } from 'date-fns';
import { chatAPI } from '../services/api';
import { getSocket, sendMessage, sendTyping, markAsRead, addReaction, editMessage, deleteMessage } from '../services/socket';
import { 
  PaperAirplaneIcon,
  FaceSmileIcon,
  PaperClipIcon,
  CheckIcon,
  CheckBadgeIcon,
  ArrowPathIcon,
  MicrophoneIcon,
  StopCircleIcon,
  XMarkIcon,
  DocumentIcon,
  ChatBubbleLeftIcon,
  PencilIcon,
  TrashIcon,
  EllipsisHorizontalIcon,
  DocumentDuplicateIcon,
  VideoCameraIcon,
  CalendarDaysIcon,
  FaceSmileIcon as FaceSmileOutline
} from '@heroicons/react/24/outline';
import { getCurrentUser, groupMessagesByDate, getInitials, getAvatarColor, formatMessageTime } from '../utils/helpers';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import { AttachmentBubble, VoiceBubble } from './ChatMedia';

const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false });

/**
 * ChatBox Component
 * Handles the display of messages, alignment, timestamps, and input logic.
 * Structured to separate MessageList, Bubble, and Input actions.
 */
export default function ChatBox({ conversationId }) {
  // --- 1. State Management ---
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [typingUsers, setTypingUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [error, setError] = useState(null);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editingContent, setEditingContent] = useState('');
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const [mediaFile, setMediaFile] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const audioChunksRef = useRef([]);

  // --- 2. Refs ---
  const messagesEndRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const fileInputRef = useRef(null);

  // --- 3. Effects & Initialization ---
  useEffect(() => {
    const user = getCurrentUser();
    setCurrentUser(user);
    console.log('[DEBUG] ChatBox initialized for user:', user?.id);
  }, []);

  useEffect(() => {
    if (conversationId) {
      console.log(`[DEBUG] Loading conversation: ${conversationId}`);
      setLoading(true);
      setError(null);
      
      const socket = getSocket();
      if (socket) {
        socket.emit('join-conversation', conversationId);
        markAsRead(conversationId);
      }

      fetchMessages();
      setupSocketListeners();
    }

    return () => {
      const socket = getSocket();
      if (socket) {
        socket.emit('leave-conversation', conversationId);
        socket.off('new-message');
        socket.off('user-typing');
        socket.off('message-sent');
      }
    };
  }, [conversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, typingUsers]);

  // --- 4. Logic & Handlers ---
  const fetchMessages = async () => {
    try {
      const response = await chatAPI.getMessages(conversationId);
      setMessages(response.data.messages || []);
      console.log(`[DEBUG] Rendered ${response.data.messages?.length || 0} messages`);
    } catch (err) {
      console.error('[DEBUG] Fetch error:', err);
      setError('Failed to load chat');
    } finally {
      setLoading(false);
    }
  };

  const setupSocketListeners = () => {
    const socket = getSocket();
    if (!socket) return;

    socket.on('new-message', (msg) => {
      if (msg.conversationId === conversationId) {
        setMessages(prev => {
          const newMsg = msg.message;
          // Check if message already exists by ID or tempId
          const exists = prev.findIndex(m => m.id === newMsg.id || (m.tempId && m.tempId === newMsg.tempId));
          
          if (exists !== -1) {
            const newMessages = [...prev];
            newMessages[exists] = newMsg;
            return newMessages;
          }
          return [...prev, newMsg];
        });
        markAsRead(conversationId);
      }
    });

    socket.on('user-typing', ({ userId, userName, isTyping }) => {
      if (userId === currentUser?.id) return;
      setTypingUsers(prev => isTyping 
        ? [...prev.filter(u => u.id !== userId), { id: userId, name: userName }]
        : prev.filter(u => u.id !== userId)
      );
    });

    socket.on('messages-read', ({ userId, conversationId: cid }) => {
      if (cid === conversationId) {
        setMessages(prev => prev.map(m => {
          if (m.senderId !== userId && (!m.readReceipts || !m.readReceipts.some(r => r.userId === userId))) {
            return {
              ...m,
              readReceipts: [...(m.readReceipts || []), { userId, readAt: new Date() }]
            };
          }
          return m;
        }));
      }
    });

    socket.on('message-sent', (sent) => {
      const sentMsg = sent.message || sent;
      setMessages(prev => prev.map(m => (m.tempId && m.tempId === sentMsg.tempId) ? sentMsg : m));
    });
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if ((!newMessage.trim() && !mediaFile) || isSending) return;

    if (isRecording) {
      stopRecording();
      return;
    }

    const tempId = `temp-${Date.now()}`;
    const type = mediaFile 
      ? (mediaFile.type.startsWith('image/') ? 'IMAGE' : mediaFile.type.startsWith('audio/') ? 'VOICE' : 'FILE')
      : 'TEXT';

    const msgData = {
      id: tempId,
      tempId,
      content: newMessage.trim(),
      senderId: currentUser.id,
      sender: currentUser,
      createdAt: new Date().toISOString(),
      type,
      fileUrl: mediaFile ? URL.createObjectURL(mediaFile) : null,
      fileName: mediaFile ? mediaFile.name : null,
      fileSize: mediaFile ? mediaFile.size : null
    };

    setMessages(prev => [...prev, msgData]);
    setNewMessage('');
    setMediaFile(null);
    setIsSending(true);

    try {
      if (mediaFile) {
        const fd = new FormData();
        const type = mediaFile.type.startsWith('image/') ? 'IMAGE' : (mediaFile.type.startsWith('audio/') ? 'VOICE' : 'FILE');
        
        fd.append('file', mediaFile);
        fd.append('conversationId', conversationId);
        fd.append('content', msgData.content);
        fd.append('type', type);
        fd.append('tempId', tempId);

        await chatAPI.uploadMessageAttachment(fd);
      } else {
        sendMessage({ conversationId, content: msgData.content, tempId });
      }
    } catch (err) {
      console.error('[DEBUG] Send error:', err);
    } finally {
      setIsSending(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await sendVoiceNote(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (err) {
      console.error('Error starting recording:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setIsRecording(false);
      setMediaRecorder(null);
    }
  };

  const sendVoiceNote = async (blob) => {
    const tempId = `temp-${Date.now()}`;
    const voiceFile = new File([blob], 'voicenote.webm', { type: 'audio/webm' });
    
    const msgData = {
      id: tempId,
      tempId,
      senderId: currentUser.id,
      sender: currentUser,
      content: 'Voice memo',
      createdAt: new Date().toISOString(),
      type: 'VOICE',
      fileUrl: URL.createObjectURL(blob)
    };
    
    setMessages(prev => [...prev, msgData]);
    setIsSending(true);

    try {
      const fd = new FormData();
      fd.append('voice', voiceFile);
      fd.append('conversationId', conversationId);
      fd.append('type', 'VOICE');
      fd.append('tempId', tempId);
      await chatAPI.uploadMessageAttachment(fd);
    } catch (err) {
      console.error('Error sending voice note:', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    if (!editingContent.trim()) return;
    editMessage(editingMessageId, editingContent.trim());
    setEditingMessageId(null);
    setEditingContent('');
  };

  // --- 5. Data Grouping ---
  const groupedMessages = useMemo(() => groupMessagesByDate(messages), [messages]);

  // --- 6. Helper Components ---
  const MessageBubble = ({ message, isMine, showSender }) => {
    const timestamp = formatMessageTime(message.createdAt);
    const isTemp = message.id?.toString().startsWith('temp');

    return (
      <div className={`flex w-full mb-4 px-2 ${isMine ? 'justify-end' : 'justify-start'}`}>
        <div className={`flex max-w-[80%] items-end space-x-2 ${isMine ? 'flex-row-reverse space-x-reverse' : 'flex-row'}`}>
          {/* Avatar (Left only) */}
          {!isMine && (
            <div className={`w-8 h-8 rounded-xl bg-slate-200 flex-shrink-0 flex items-center justify-center text-[10px] font-black ${showSender ? 'opacity-100' : 'opacity-0'}`}>
              {getInitials(message.sender?.name)}
            </div>
          )}

          <div className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
            {showSender && !isMine && <span className="text-[10px] font-bold text-slate-400 mb-1 ml-1 uppercase">{message.sender?.name}</span>}
            
            <div 
              onMouseDown={(e) => {
                const timer = setTimeout(() => {
                  if (!message.isDeleted && !editingMessageId) setActiveMenuId(message.id);
                  if (navigator.vibrate) navigator.vibrate(50); // Haptic feedback
                }, 500);
                e.currentTarget.dataset.timer = timer;
              }}
              onMouseUp={(e) => clearTimeout(e.currentTarget.dataset.timer)}
              onMouseLeave={(e) => clearTimeout(e.currentTarget.dataset.timer)}
              onTouchStart={(e) => {
                const timer = setTimeout(() => {
                  if (!message.isDeleted && !editingMessageId) setActiveMenuId(message.id);
                  if (navigator.vibrate) navigator.vibrate(50);
                }, 500);
                e.currentTarget.dataset.timer = timer;
              }}
              onTouchEnd={(e) => clearTimeout(e.currentTarget.dataset.timer)}
              onTouchMove={(e) => clearTimeout(e.currentTarget.dataset.timer)}
              className={`group relative p-3 rounded-2xl shadow-sm border select-none touch-none ${
                isMine ? 'bg-primary-600 border-primary-500 text-white rounded-tr-none' : 'bg-white border-slate-100 text-slate-800 rounded-tl-none'
              }`}
            >
              {/* Message Context */}
              {editingMessageId === message.id ? (
                <div className="min-w-[180px]">
                  <textarea 
                    autoFocus 
                    value={editingContent} 
                    onChange={e => setEditingContent(e.target.value)}
                    className="w-full bg-transparent border-none p-0 text-sm focus:ring-0 resize-none"
                  />
                  <div className="flex justify-end space-x-2 mt-2">
                    <button onClick={() => setEditingMessageId(null)} className="text-[10px] font-bold opacity-60">Cancel</button>
                    <button onClick={handleEdit} className="text-[10px] font-bold text-emerald-400">Save</button>
                  </div>
                </div>
              ) : message.isDeleted ? (
                <span className="text-xs italic opacity-50">This message was deleted</span>
              ) : (
                <div className="space-y-2">
                  {/* Media Support (Real messages) */}
                  {(message.type === 'IMAGE' || message.type === 'FILE') && message.fileUrl && (
                    <AttachmentBubble message={message} />
                  )}
                  {message.type === 'VOICE' && message.fileUrl && (
                    <VoiceBubble message={message} />
                  )}

                  {/* Temp message attachments mapping */}
                  {message.attachments?.map((a, i) => (
                    <AttachmentBubble 
                      key={i} 
                      message={{ ...message, fileUrl: a.url, fileName: a.name }} 
                    />
                  ))}
                  
                  {/* Content Rendering Logic */}
                  {message.content && (
                    <>
                      {/* 1. Call Link Card Detection */}
                      {message.content.includes('Join here: https://') ? (
                        <div className="min-w-[200px] sm:min-w-[240px] bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 shadow-inner">
                          <div className="flex items-center space-x-3 mb-3">
                            <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                              <VideoCameraIcon className="w-6 h-6 text-emerald-400" />
                            </div>
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Video Call</p>
                              <p className="text-xs font-bold text-white">Call invitation sent</p>
                            </div>
                          </div>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              const url = message.content.split('Join here: ')[1];
                              window.open(url, '_blank');
                            }}
                            className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-black shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center space-x-2"
                          >
                            <span>Join Call</span>
                            <ArrowPathIcon className="w-3 h-3" />
                          </button>
                        </div>
                      ) : 
                      /* 2. Scheduled Call Detection */
                      message.content.includes('🗓️ Scheduled a call') ? (
                        <div className="min-w-[200px] sm:min-w-[240px] bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 shadow-inner">
                          <div className="flex items-center space-x-3 mb-3">
                            <div className="w-10 h-10 rounded-full bg-primary-500/20 flex items-center justify-center">
                              <CalendarDaysIcon className="w-6 h-6 text-primary-300" />
                            </div>
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-widest text-primary-300">Appointment</p>
                              <p className="text-xs font-bold text-white">Call Scheduled</p>
                            </div>
                          </div>
                          <p className="text-[11px] text-white/80 font-medium mb-3">
                            {message.content.replace('🗓️ Scheduled a call for ', '')}
                          </p>
                          <button className="w-full py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-black border border-white/10 transition-all">
                            Add to Calendar
                          </button>
                        </div>
                      ) : (
                        /* Default Text Bubble */
                        <p className="text-sm font-medium leading-relaxed break-words">{message.content}</p>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Timestamp Meta */}
              <div className={`flex items-center mt-1.5 space-x-1 justify-end ${isMine ? 'text-white/60' : 'text-slate-400'}`}>
                <span className="text-[9px] font-bold italic">{timestamp}</span>
                {isMine && (
                  isTemp ? (
                    <ArrowPathIcon className="w-2.5 h-2.5 animate-spin" />
                  ) : (
                    <div className="flex -space-x-1">
                      {/* Double Tick Logic */}
                      {(message.readReceipts?.length > 0) ? (
                        <>
                          <CheckIcon className="w-3 h-3 stroke-[4px] text-emerald-400 drop-shadow-sm" />
                          <CheckIcon className="w-3 h-3 stroke-[4px] text-emerald-400 drop-shadow-sm" />
                        </>
                      ) : (
                        <CheckIcon className="w-3 h-3 stroke-[4px] text-white/50" />
                      )}
                    </div>
                  )
                )}
              </div>

              {/* Action Menu Popover (Inline Logic) */}
              <AnimatePresence>
                {activeMenuId === message.id && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9, y: 5 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 5 }}
                    className={`absolute z-[2000] bottom-full mb-2 bg-white rounded-xl shadow-2xl border border-slate-100 min-w-[140px] overflow-hidden ${isMine ? 'right-0' : 'left-0'}`}
                    onClick={e => e.stopPropagation()}
                  >
                    <div className="flex justify-around p-2 bg-slate-50 border-b border-slate-100">
                      {['❤️', '👍', '🔥', '😂'].map(e => <button key={e} onClick={() => addReaction(message.id, e)} className="hover:scale-125 transition-transform">{e}</button>)}
                    </div>
                    <div className="p-1 flex flex-col">
                      <button onClick={() => { navigator.clipboard.writeText(message.content); setActiveMenuId(null); }} className="flex items-center space-x-2 px-3 py-2 text-[10px] font-black text-slate-600 hover:bg-slate-50 rounded-lg">
                        <DocumentDuplicateIcon className="w-3.5 h-3.5" /> <span>Copy text</span>
                      </button>
                      {isMine && !message.isDeleted && (
                        <>
                          <button onClick={() => { setEditingMessageId(message.id); setEditingContent(message.content); setActiveMenuId(null); }} className="flex items-center space-x-2 px-3 py-2 text-[10px] font-black text-slate-600 hover:bg-slate-50 rounded-lg">
                            <PencilIcon className="w-3.5 h-3.5" /> <span>Edit</span>
                          </button>
                          <button onClick={() => { deleteMessage(message.id); setActiveMenuId(null); }} className="flex items-center space-x-2 px-3 py-2 text-[10px] font-black text-red-500 hover:bg-red-50 rounded-lg">
                            <TrashIcon className="w-3.5 h-3.5" /> <span>Delete</span>
                          </button>
                        </>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // --- 7. Final Render ---
  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-50/50">
      {/* Scrollable Message Area */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto pt-6 pb-2 scroll-smooth scrollbar-hide">
        {loading ? (
          <div className="h-full flex items-center justify-center"><ArrowPathIcon className="w-8 h-8 text-primary-600 animate-spin" /></div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center opacity-40">
            <ChatBubbleLeftIcon className="w-12 h-12 mb-2" />
            <p className="font-bold">No messages yet</p>
          </div>
        ) : (
          Object.entries(groupedMessages).map(([date, dateMsgs]) => (
            <div key={date} className="px-2">
              <div className="flex justify-center my-6 sticky top-2 z-10">
                <span className="bg-white/90 backdrop-blur px-3 py-1 rounded-full border border-slate-100 text-[9px] font-black text-slate-400 uppercase tracking-widest shadow-sm">
                  {formatMessageTime(date)}
                </span>
              </div>
              <div className="space-y-1">
                {dateMsgs.map((m, i) => (
                  <MessageBubble 
                    key={m.id || m.tempId} 
                    message={m} 
                    isMine={m.senderId === currentUser?.id || m.sender?.id === currentUser?.id} 
                    showSender={i === 0 || dateMsgs[i-1].senderId !== m.senderId}
                  />
                ))}
              </div>
            </div>
          ))
        )}
        
        {/* Typing Overlay (Absolute/Bottom) */}
        {typingUsers.length > 0 && (
          <div className="px-6 py-2 flex items-center space-x-2 text-slate-400 italic text-[10px] font-bold">
            <div className="flex space-x-1"><span className="w-1 h-1 bg-slate-300 rounded-full animate-bounce" /><span className="w-1 h-1 bg-slate-300 rounded-full animate-bounce [animation-delay:0.2s]" /></div>
            <span>{typingUsers[0].name} typing...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Footer Input Area */}
      <div className="p-3 bg-white border-t border-slate-100 shadow-[0_-10px_40px_rgba(0,0,0,0.02)]">
        <form onSubmit={handleSendMessage} className="flex flex-col space-y-2">
          {mediaFile && (
            <div className="flex items-center justify-between bg-primary-50 p-2 rounded-xl border border-primary-100 mx-1">
              <div className="flex items-center space-x-2">
                <DocumentIcon className="w-4 h-4 text-primary-600" />
                <span className="text-[10px] font-black text-primary-800 truncate max-w-[200px]">{mediaFile.name}</span>
              </div>
              <button onClick={() => setMediaFile(null)}><XMarkIcon className="w-4 h-4 text-primary-400 hover:text-red-500" /></button>
            </div>
          )}

          <div className="flex items-end space-x-2">
            {!isRecording ? (
              <>
                <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2.5 text-slate-400 hover:bg-slate-50 rounded-2xl transition-all">
                  <PaperClipIcon className="w-5 h-5 stroke-[2.5px]" />
                  <input type="file" ref={fileInputRef} className="hidden" onChange={e => setMediaFile(e.target.files[0])} />
                </button>
                
                <div className="flex-1 bg-slate-100 rounded-[22px] border border-transparent focus-within:bg-white focus-within:border-slate-200 transition-all p-1">
                  <textarea
                    value={newMessage}
                    onChange={e => { 
                      setNewMessage(e.target.value); 
                      // Smart Typing Emitter
                      sendTyping(conversationId, true);
                      if (window.typingTimeout) clearTimeout(window.typingTimeout);
                      window.typingTimeout = setTimeout(() => {
                        sendTyping(conversationId, false);
                      }, 2000);
                    }}
                    placeholder="Message..."
                    className="w-full bg-transparent border-none text-sm py-2 px-3 max-h-32 resize-none focus:ring-0 font-medium"
                    rows={1}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                  />
                </div>

                {newMessage.trim() || mediaFile ? (
                  <button 
                    type="submit" 
                    disabled={isSending}
                    className="p-3 bg-primary-600 text-white rounded-[18px] shadow-lg shadow-primary-600/30 hover:scale-105 active:scale-95 disabled:opacity-30 transition-all"
                  >
                    {isSending ? <ArrowPathIcon className="w-5 h-5 animate-spin" /> : <PaperAirplaneIcon className="w-5 h-5 -rotate-45" />}
                  </button>
                ) : (
                  <button 
                    type="button"
                    onClick={startRecording}
                    className="p-3 text-primary-600 hover:bg-primary-50 rounded-[18px] transition-all"
                  >
                    <MicrophoneIcon className="w-6 h-6" />
                  </button>
                )}
              </>
            ) : (
              <div className="flex-1 flex items-center justify-between bg-red-50 p-2 rounded-2xl border border-red-100 animate-pulse">
                <div className="flex items-center space-x-3 px-2">
                  <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-ping" />
                  <span className="text-xs font-black text-red-600 tracking-tighter uppercase">Recording Voice Note...</span>
                </div>
                <button 
                  type="button"
                  onClick={stopRecording}
                  className="p-2 bg-red-600 text-white rounded-xl shadow-lg shadow-red-600/20"
                >
                  <StopCircleIcon className="w-6 h-6" />
                </button>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
