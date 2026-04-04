import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
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
  ChevronDownIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { getCurrentUser, groupMessagesByDate, getInitials, getAvatarColor, formatMessageTime, getFullFileUrl } from '../utils/helpers';
import dynamic from 'next/dynamic';
import { AttachmentBubble, VoiceBubble } from './ChatMedia';
import { 
  initDB, 
  cacheMessages, 
  getCachedMessages, 
  queueMessage, 
  getOutboxMessages, 
  removeFromOutbox 
} from '../utils/indexedDB';
import Markdown from 'markdown-to-jsx';

const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false });
// --- Memoized Message Bubble Component (defined at module scope to prevent remounting on ChatBox re-renders) ---
const MessageBubble = React.memo(({ 
  message, 
  isMine, 
  showSender, 
  currentUser, 
  activeMenuId, 
  setActiveMenuId, 
  editingMessageId, 
  editingContent, 
  setEditingMessageId, 
  setEditingContent, 
  handleEdit, 
  addReaction, 
  deleteMessage,
  handleJoinCall,
  onReply
}) => {
  const timestamp = formatMessageTime(message.createdAt);
  const isTemp = message.id?.toString().startsWith('temp');
  const isNana = message.sender?.role?.toUpperCase() === 'NANA';

  const [touchStart, setTouchStart] = useState(null);
  const [swipeOffset, setSwipeOffset] = useState(0);

  const handleTouchStart = (e) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e) => {
    if (!touchStart || isMine) return;
    const currentTouch = e.targetTouches[0].clientX;
    const diff = currentTouch - touchStart;
    if (diff > 0 && diff < 80) setSwipeOffset(diff);
  };

  const handleTouchEnd = () => {
    if (swipeOffset > 50) onReply(message);
    setSwipeOffset(0);
    setTouchStart(null);
  };

  const bubbleClasses = isNana 
    ? `group relative p-5 rounded-[24px] shadow-sm border select-none animate-fade-in w-full bg-white border-slate-100 text-slate-800 leading-relaxed break-words`
    : `chat-bubble ${isMine ? 'chat-bubble-me' : 'chat-bubble-other'} animate-fade-in select-none touch-pan-y`;

  const nanaStyles = isNana ? {
    display: "block",
    width: "100%",
    maxWidth: "100%",
    wordBreak: "normal",
    whiteSpace: "pre-wrap",
    overflowWrap: "break-word",
    wordWrap: "break-word"
  } : {};

  return (
    <div 
      className={`flex w-full mb-5 px-2 ${isMine ? 'justify-end' : 'justify-start'} transition-transform duration-200`}
      style={{ transform: `translateX(${swipeOffset}px)` }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className={`flex ${isNana ? 'w-full' : 'max-w-[90%]'} items-end space-x-2 ${isMine ? 'flex-row-reverse space-x-reverse' : 'flex-row'}`}>
        {!isNana && (
          <div className="relative group shrink-0">
            <div className={`w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center text-[10px] font-black overflow-hidden ${showSender ? 'opacity-100' : 'opacity-0'} ${message.sender?.role?.toUpperCase() === 'NANA' ? 'bg-gradient-to-tr from-primary-500 to-indigo-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
              {(() => {
                const avatar = message.sender?.avatar;
                const fullUrl = getFullFileUrl(avatar);
                return fullUrl ? (
                  <img src={fullUrl} className="w-full h-full object-cover" alt="" />
                ) : (
                  getInitials(message.sender?.name)
                );
              })()}
            </div>
          </div>
        )}

        <div className={`flex flex-col min-w-0 ${isNana ? 'w-full' : isMine ? 'items-end' : 'items-start'}`}>
          {showSender && !isMine && (
            <div className={`flex items-center space-x-1.5 mb-1 ${isNana ? 'ml-0' : 'ml-1'} uppercase`}>
              <span className="text-[10px] font-black text-primary-600 flex items-center gap-1">
                {isNana && <div className="w-1.5 h-1.5 bg-primary-500 rounded-full animate-pulse" />}
                {message.sender?.name}
              </span>
              {message.sender?.role?.toUpperCase() === 'LECTURER' && (
                <span className="text-[8px] font-black px-1.5 py-0.5 bg-rose-50 text-rose-600 rounded-md border border-rose-100 flex items-center">
                  <CheckBadgeIcon className="w-2.5 h-2.5 mr-0.5" />
                  LECTURER
                </span>
              )}
              {message.sender?.role?.toUpperCase() === 'COURSE_REP' && (
                <span className="text-[8px] font-black px-1.5 py-0.5 bg-primary-50 text-primary-600 rounded-md border border-primary-100 flex items-center">
                   <div className="w-1.5 h-1.5 bg-primary-400 rounded-full animate-pulse mr-1" />
                   COURSE REP
                </span>
              )}
            </div>
          )}
          
          <div 
            onMouseDown={(e) => {
              const timer = setTimeout(() => {
                if (!message.isDeleted && !editingMessageId) setActiveMenuId(message.id);
                if (navigator.vibrate) navigator.vibrate(50);
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
            className={bubbleClasses}
            style={nanaStyles}
          >
            {message.replyTo && !message.isDeleted && (
              <div className={`mb-2 p-2 rounded-lg border-l-4 text-[10px] bg-black/5 ${isMine ? 'border-white/40' : 'border-primary-500 bg-primary-50'}`}>
                <p className="font-black uppercase tracking-tight opacity-60">
                   Replying to {message.replyTo.sender?.name || 'User'}
                </p>
                <p className="truncate opacity-80">{message.replyTo.content || 'Attachment'}</p>
              </div>
            )}

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
                {(message.type === 'IMAGE' || message.type === 'FILE') && message.fileUrl && (
                  <AttachmentBubble message={message} />
                )}
                {message.type === 'VOICE' && message.fileUrl && (
                  <VoiceBubble message={message} />
                )}
                {message.attachments?.map((a, i) => (
                  <AttachmentBubble key={i} message={{ ...message, fileUrl: a.url, fileName: a.name }} />
                ))}
                {message.content && (
                  <>
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
                          onClick={(e) => { e.stopPropagation(); const url = message.content.split('Join here: ')[1]; window.open(url, '_blank'); }}
                          className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-black shadow-lg shadow-emerald-500/20 transition-colors flex items-center justify-center space-x-2"
                        >
                          <span>Join Call</span>
                          <ArrowPathIcon className="w-3 h-3" />
                        </button>
                      </div>
                    ) : message.content.includes('🗓️ Scheduled a call') ? (
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
                        <p className="text-[11px] text-white/80 font-medium mb-3">{message.content.replace('🗓️ Scheduled a call for ', '')}</p>
                        <button className="w-full py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-black border border-white/10 transition-colors">Add to Calendar</button>
                      </div>
                    ) : isNana ? (
                      <div className="markdown-body w-full">
                        <Markdown
                          options={{
                            overrides: {
                              h2: { component: ({children}) => <h2 className="text-xl font-black text-primary-700 mb-3 mt-1 leading-tight">{children}</h2> },
                              h3: { component: ({children}) => <h3 className="text-lg font-black text-slate-800 mb-2 mt-2">{children}</h3> },
                              p: { component: ({children}) => <p className="mb-4 last:mb-0 leading-relaxed text-slate-700">{children}</p> },
                              ul: { component: ({children}) => <ul className="list-disc ml-5 space-y-2 mb-4 mt-2">{children}</ul> },
                              ol: { component: ({children}) => <ol className="list-decimal ml-5 space-y-2 mb-4 mt-2">{children}</ol> },
                              li: { component: ({children}) => <li className="text-[15px] font-medium leading-relaxed text-slate-600">{children}</li> },
                              strong: { component: ({children}) => <strong className="font-extrabold text-primary-800 bg-primary-50 px-1 rounded">{children}</strong> }
                            }
                          }}
                        >
                          {message.content}
                        </Markdown>
                      </div>
                    ) : (
                      <p className={`font-medium leading-relaxed whitespace-pre-wrap break-words text-sm`}>{message.content}</p>
                    )}
                  </>
                )}
              </div>
            )}

            <div className={`flex items-center mt-1.5 space-x-1 justify-end ${isMine ? 'text-white/60' : 'text-black/40'}`}>
              <span className="text-[9px] font-bold italic">{timestamp}</span>
              {isMine && (
                isTemp ? (
                  <ArrowPathIcon className="w-2.5 h-2.5 animate-spin" />
                ) : (
                  <div className="flex -space-x-1">
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

            {activeMenuId === message.id && (
              <>
                <div 
                  className="fixed inset-0 z-[1999]" 
                  onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); }}
                  onTouchStart={(e) => { e.stopPropagation(); setActiveMenuId(null); }}
                />
                <div 
                  className={`absolute z-[2000] bottom-full mb-2 bg-white rounded-xl shadow-2xl border border-slate-100 min-w-[140px] overflow-hidden ${isMine ? 'right-0' : 'left-0'}`}
                  onClick={e => e.stopPropagation()}
                >
                  <div className="flex justify-around p-2 bg-slate-50 border-b border-slate-100">
                    {['❤️', '👍', '🔥', '😂'].map(e => (
                      <button key={e} onClick={() => { addReaction(message.id, e); setActiveMenuId(null); }} className="hover:scale-125 transition-transform">
                        {e}
                      </button>
                    ))}
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
                          <TrashIcon className="w-3.5 h-3.5" /> <span>Delete message</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

export default function ChatBox({ conversationId }) {
  // --- 1. State Management ---
  const typingTimeoutRef = useRef(null);
  const isCurrentlyTyping = useRef(false);

  const [messages, setMessages] = useState([]);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [typingUsers, setTypingUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [error, setError] = useState(null);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const [mediaFile, setMediaFile] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editingContent, setEditingContent] = useState('');
  const [isSending, setIsSending] = useState(false);
  const audioChunksRef = useRef([]);

  // Nana Session Logic
  const NANA_USER_ID = '7951b52c-b14e-486a-a802-8e0a9fa2495b';
  const isNanaSession = (messages && messages.some(m => m.senderId === NANA_USER_ID || m.sender?.role === 'NANA')) || 
                        (conversationId === '__nana__');

  // 1. Session Greeting Logic
  useEffect(() => {
    if (isNanaSession && messages.length === 0) {
      const hasGreeted = sessionStorage.getItem(`greeted_${conversationId}`);
      if (!hasGreeted) {
        sessionStorage.setItem(`greeted_${conversationId}`, 'true');
      }
    }
  }, [isNanaSession, messages.length, conversationId]);

  const QUICK_ACTIONS = [
    { label: '📚 Courses Help', query: 'Tell me about available courses' },
    { label: '📅 Campus Events', query: 'What events are happening this week?' },
    { label: '🍲 Food on Campus', query: 'Where can I get good food on campus?' },
    { label: '🏫 Departments', query: 'List all departments in KTU' },
    { label: '🛒 Buy & Sell', query: 'How do I use the campus marketplace?' },
  ];

  const handleQuickAction = (query) => {
    setNewMessage(query);
  };

  // --- Real-time Course Features ---
  const [convData, setConvData] = useState(null);
  const [isLocked, setIsLocked] = useState(false);
  const [userRole, setUserRole] = useState('STUDENT');

  // --- 2. Refs ---
  const messagesEndRef = useRef(null);
  const [bgColor, setBgColor] = useState('bg-white');
  const scrollContainerRef = useRef(null);
  const fileInputRef = useRef(null);
  const convDataRef = useRef(null);
  const userRoleRef = useRef('STUDENT');

  useEffect(() => {
    convDataRef.current = convData;
  }, [convData]);

  useEffect(() => {
    userRoleRef.current = userRole;
  }, [userRole]);

  // --- 3. Effects & Initialization ---
  useEffect(() => {
    const user = getCurrentUser();
    setCurrentUser(user);
    
    // Load background preference
    const savedBg = localStorage.getItem('chat_bg_color');
    if (savedBg) setBgColor(savedBg);

    // Sync outbox if we come online
    const handleOnline = () => syncOutbox();
    window.addEventListener('online', handleOnline);

    return () => window.removeEventListener('online', handleOnline);
  }, []);

  useEffect(() => {
    if (conversationId) {
      console.log(`[DEBUG] Loading conversation: ${conversationId}`);
      
      // --- CACHE-FIRST LOGIC (IndexedDB) ---
      const loadCachedData = async () => {
        try {
          const cached = await getCachedMessages(conversationId);
          const outboxRaw = await getOutboxMessages();
          const outbox = outboxRaw.filter(m => m.conversationId === conversationId);
          
          if (cached && cached.length > 0) {
            setMessages([...cached, ...outbox]);
            setLoading(false);
          } else if (outbox.length > 0) {
            setMessages(outbox);
            setLoading(false);
          } else {
            setLoading(true);
          }
        } catch (e) {
          setLoading(true);
        }
      };
      
      loadCachedData();
      setError(null);
      
      const socket = getSocket();
      if (socket) {
        socket.emit('join-conversation', conversationId);
        markAsRead(conversationId);
      }

      fetchMessages();
      setupSocketListeners();
      syncOutbox();
    }

    return () => {
      const socket = getSocket();
      if (socket) {
        socket.emit('leave-conversation', conversationId);
        socket.off('new-message');
        socket.off('user-typing');
        socket.off('message-sent');
        socket.off('chat-cleared');
        socket.off('messages-read');
        socket.off('message-deleted');
        socket.off('chat-lock-updated');
        socket.off('course-role-updated');
        socket.off('role-upgraded');
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
      const newMessages = response.data.messages || [];
      const conversation = response.data.conversation;

      if (conversation) {
        setConvData(conversation);
        if (conversation.type === 'COURSE' && conversation.course) {
          setIsLocked(!!conversation.course.announcementsOnly);
          const membership = conversation.course.memberships?.[0];
          setUserRole(membership?.role || 'STUDENT');
        }
      }

      setMessages(prev => {
         // Merge with outbox
         const outbox = prev.filter(m => m.id?.toString().startsWith('temp'));
         return [...newMessages, ...outbox];
      });
      
      // Update persistent IndexedDB cache
      await cacheMessages(conversationId, newMessages);
      
      console.log(`[DEBUG] Rendered ${newMessages.length} messages`);
    } catch (err) {
      console.error('[DEBUG] Fetch error:', err);
      setError('Failed to load chat');
    } finally {
      setLoading(false);
    }
  };

  const syncOutbox = async () => {
    if (!navigator.onLine) return;
    try {
      const outbox = await getOutboxMessages();
      if (outbox.length === 0) return;

      console.log('[OFFLINE] Syncing outbox...', outbox.length);
      for (const msg of outbox) {
        if (!msg.fileUrl) { // Only sync text for now for simplicity, attachments are harder offline
           sendMessage({ 
             conversationId: msg.conversationId, 
             content: msg.content, 
             tempId: msg.tempId, 
             replyToId: msg.replyToId 
           });
           await removeFromOutbox(msg.tempId);
        }
      }
    } catch (err) {
      console.error('Outbox sync failed:', err);
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

    socket.on('message-deleted', ({ messageId }) => {
      setMessages(prev => prev.map(m => 
        m.id === messageId ? { ...m, isDeleted: true, content: 'This message was deleted' } : m
      ));
    });

    socket.on('chat-cleared', ({ conversationId: cid }) => {
      if (cid === conversationId) {
        setMessages([]);
      }
    });

    socket.on('message-sent', (sent) => {
      const sentMsg = sent.message || sent;
      setMessages(prev => prev.map(m => (m.tempId && m.tempId === sentMsg.tempId) ? sentMsg : m));
    });

    // --- UNIVERSITY REAL-TIME FEATURES ---
    socket.on('chat-lock-updated', ({ locked, courseId }) => {
      // Use Ref to avoid stale closure
      if (convDataRef.current?.courseId === courseId || convDataRef.current?.course?.id === courseId) {
        setIsLocked(locked);
      }
    });

    socket.on('course-role-updated', ({ userId, role, courseId }) => {
      if (userId === currentUser?.id && (convDataRef.current?.courseId === courseId || convDataRef.current?.course?.id === courseId)) {
        setUserRole(role);
      }
    });

    socket.on('role-upgraded', ({ courseId, newRole }) => {
       if (convDataRef.current?.courseId === courseId || convDataRef.current?.course?.id === courseId) {
         setUserRole(newRole);
       }
    });
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e, overrideContent = null) => {
    if (e) e.preventDefault();
    const contentToSend = overrideContent || newMessage;
    if ((!contentToSend.trim() && !mediaFile) || isSending) return;

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
      content: contentToSend.trim(),
      senderId: currentUser.id || currentUser._id,
      sender: currentUser,
      createdAt: new Date().toISOString(),
      type,
      replyTo,
      replyToId: replyTo?.id,
      fileUrl: mediaFile ? URL.createObjectURL(mediaFile) : null,
      fileName: mediaFile ? mediaFile.name : null,
      fileSize: mediaFile ? mediaFile.size : null
    };

    setMessages(prev => [...prev, msgData]);
    setNewMessage('');
    setMediaFile(null);
    setReplyTo(null);

    // --- OFFLINE QUEUING LOGIC ---
    if (!navigator.onLine) {
        await queueMessage({ ...msgData, conversationId });
        console.log('[OFFLINE] Message queued to outbox');
        return;
    }

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
        if (replyTo?.id) fd.append('replyToId', replyTo.id);

        await chatAPI.uploadMessageAttachment(fd);
      } else {
        sendMessage({ conversationId, content: msgData.content, tempId, replyToId: replyTo?.id });
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
      const mimeType = MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : 'audio/webm';
      const recorder = new MediaRecorder(stream, { mimeType });
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        const extension = mimeType.includes('mp4') ? 'm4a' : 'webm';
        await sendVoiceNote(audioBlob, extension);
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

  const sendVoiceNote = async (blob, extension = 'webm') => {
    const tempId = `temp-${Date.now()}`;
    const voiceFile = new File([blob], `voicenote.${extension}`, { type: blob.type });
    
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

  const handleJoinCall = useCallback((content) => {
    const cid = content.split('call/')[1]?.split(' ')[0];
    if (cid) window.open(`/call/${cid}`, '_blank');
  }, []);

  const handleDeleteMessage = useCallback((msgId) => {
    if (msgId && !msgId.toString().startsWith('temp')) {
      deleteMessage(msgId);
    }
  }, []);

  const handleReplyTo = useCallback((msg) => {
    if (msg?.isDeleted) return;
    setReplyTo(msg);
    if (navigator.vibrate) navigator.vibrate(20);
  }, []);

  const handleInputChange = useCallback((e) => {
    const val = e.target.value;
    setNewMessage(val);

    if (!isCurrentlyTyping.current && val.trim().length > 0) {
      isCurrentlyTyping.current = true;
      sendTyping(conversationId, true);
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    typingTimeoutRef.current = setTimeout(() => {
      isCurrentlyTyping.current = false;
      sendTyping(conversationId, false);
    }, 2000);
  }, [conversationId]);

  // --- 5. Data Grouping ---
  const groupedMessages = useMemo(() => groupMessagesByDate(messages), [messages]);


  // --- 6. Final Render ---
  const canSend = !isLocked || userRoleRef.current === 'LECTURER' || userRoleRef.current === 'COURSE_REP' || currentUser?.role === 'LECTURER' || currentUser?.role === 'ADMIN';

  return (
    <div className={`flex-1 flex flex-col min-h-0 relative transition-colors duration-500 bg-white overflow-hidden`}>
      <div 
        ref={scrollContainerRef} 
        onScroll={() => {
          if (scrollContainerRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
            const atBottom = scrollHeight - scrollTop - clientHeight < 300;
            if (showScrollBottom === atBottom) setShowScrollBottom(!atBottom);
          }
        }}
        className="flex-1 overflow-y-auto p-4 scrollbar-hide overscroll-contain relative"
        style={{ overflowAnchor: 'auto' }}
      >
        {showScrollBottom && (
          <button
            onClick={() => scrollToBottom()}
            className="absolute bottom-24 right-4 p-2.5 bg-white shadow-xl border border-slate-100 text-primary-600 rounded-full hover:bg-slate-50 transition-all z-30"
          >
            <ChevronDownIcon className="w-5 h-5 stroke-[3px]" />
          </button>
        )}
        {loading ? (
          <div className="h-full flex items-center justify-center">
              <div className="flex flex-col items-center">
                  <div className="w-10 h-10 border-4 border-slate-100 border-t-primary-600 rounded-full animate-spin shadow-sm"></div>
                  <p className="mt-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Gathering messages...</p>
              </div>
          </div>
        ) : !conversationId ? (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-slate-50/30">
              <div className="w-20 h-20 rounded-3xl bg-white shadow-xl flex items-center justify-center mb-6">
                <ChatBubbleLeftIcon className="w-10 h-10 text-primary-400" />
              </div>
              <h3 className="text-lg font-black text-slate-800 tracking-tight">Select a conversation</h3>
              <p className="text-xs text-slate-400 font-bold mt-2 max-w-xs leading-relaxed uppercase tracking-wider">Choose a contact from your inbox to start a secure encrypted chat session.</p>
            </div>
        ) : messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-700">
            <div className="w-20 h-20 rounded-[28px] bg-primary-50 flex items-center justify-center mb-6 shadow-sm border border-primary-100">
              <SparklesIcon className="w-10 h-10 text-primary-600" />
            </div>
            <h3 className="text-xl font-black text-slate-800 tracking-tight">
              {isNanaSession ? "Nana is here to help!" : "No messages yet"}
            </h3>
            <p className="text-xs text-slate-400 font-bold mt-2 max-w-[240px] leading-relaxed uppercase tracking-widest">
              {isNanaSession 
                ? "Ask about courses, food, or campus events. I'm your KTU specialist!" 
                : "Your conversation history will appear here. Start by sending a message below."}
            </p>
            
            {isNanaSession && (
              <div className="mt-8 grid grid-cols-1 gap-2 w-full max-w-xs">
                {QUICK_ACTIONS.slice(0, 3).map((action, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(null, action.query)}
                    className="p-3 bg-white border border-slate-100 rounded-2xl text-[11px] font-black text-slate-600 hover:border-primary-300 hover:text-primary-600 transition-all text-left shadow-sm flex items-center gap-2 group"
                  >
                    <span className="group-hover:scale-110 transition-transform">{action.label.split(' ')[0]}</span>
                    <span>{action.label.split(' ').slice(1).join(' ')}</span>
                  </button>
                ))}
              </div>
            )}
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
                    currentUser={currentUser}
                    activeMenuId={activeMenuId}
                    setActiveMenuId={setActiveMenuId}
                    editingMessageId={editingMessageId}
                    editingContent={editingContent}
                    setEditingMessageId={setEditingMessageId}
                    setEditingContent={setEditingContent}
                    handleEdit={handleEdit}
                    addReaction={addReaction}
                    deleteMessage={handleDeleteMessage}
                    handleJoinCall={handleJoinCall}
                    onReply={handleReplyTo}
                  />
                ))}
              </div>
            </div>
          ))
        )}
        
        {typingUsers.length > 0 && (
          <div className="px-6 py-3 flex items-center space-x-3 bg-gradient-to-r from-white/80 to-transparent backdrop-blur-sm animate-in fade-in slide-in-from-left-4 duration-500">
            <div className="flex space-x-1.5 items-center h-4">
              <span className="w-1.5 h-1.5 bg-primary-600 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <span className="w-1.5 h-1.5 bg-primary-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <span className="w-1.5 h-1.5 bg-primary-400 rounded-full animate-bounce" />
            </div>
            <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest bg-white/50 px-3 py-1 rounded-full border border-slate-100 shadow-sm">
              {typingUsers[0].name} is active
            </span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Footer Input Area */}
      <div className="z-20 p-3 pb-[max(env(safe-area-inset-bottom,12px),12px)] bg-white border-t border-slate-100 shadow-[0_-10px_40px_rgba(0,0,0,0.02)] shrink-0 relative">
        {isNanaSession && messages.length > 0 && (
          <div className="flex items-center space-x-2 px-1 mb-3 overflow-x-auto no-scrollbar pb-1">
            {QUICK_ACTIONS.map((action, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(null, action.query)}
                className="whitespace-nowrap px-4 py-2 bg-slate-50 border border-slate-100 rounded-full text-[10px] font-extrabold text-slate-500 hover:bg-primary-50 hover:text-primary-600 hover:border-primary-200 transition-all flex items-center gap-1.5 shadow-sm"
              >
                <span>{action.label.split(' ')[0]}</span>
                <span>{action.label.split(' ').slice(1).join(' ')}</span>
              </button>
            ))}
          </div>
        )}
        {showEmojiPicker && (
          <div className="absolute bottom-full right-4 mb-4 z-50 shadow-2xl animate-in slide-in-from-bottom-5">
            <EmojiPicker 
              onEmojiClick={(emojiData) => { setNewMessage(p => p + emojiData.emoji); setShowEmojiPicker(false); }}
              lazyLoadEmojis={true}
              autoFocusSearch={false}
            />
          </div>
        )}
        <form onSubmit={handleSendMessage} className="flex flex-col space-y-2">
          {replyTo && (
            <div className="flex items-center justify-between bg-slate-50 p-2 rounded-xl border-l-4 border-primary-500 mx-1 mb-1 animate-in slide-in-from-bottom-2">
              <div className="flex-1 min-w-0 px-2">
                <p className="text-[9px] font-black text-primary-600 uppercase tracking-widest">Replying to {replyTo.sender?.name}</p>
                <p className="text-xs text-slate-500 truncate">{replyTo.content || 'Attachment'}</p>
              </div>
              <button type="button" onClick={() => setReplyTo(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
          )}
          
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
                <button 
                  type="button" 
                  disabled={!canSend}
                  onClick={() => fileInputRef.current?.click()} 
                  className="p-2.5 text-slate-400 hover:bg-slate-50 rounded-2xl transition-all disabled:opacity-30 disabled:grayscale"
                >
                  <PaperClipIcon className="w-5 h-5 stroke-[2.5px]" />
                  <input type="file" ref={fileInputRef} className="hidden" onChange={e => setMediaFile(e.target.files[0])} />
                </button>
                
                <div className={`flex-1 flex items-center rounded-[22px] border transition-all p-1 ${!canSend ? 'bg-slate-50 border-slate-100' : 'bg-slate-100 border-transparent focus-within:bg-white focus-within:border-slate-200'}`}>
                  <button 
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="p-2 text-slate-400 hover:text-primary-600 transition-colors"
                  >
                    <FaceSmileIcon className="w-5 h-5 stroke-[2.2px]" />
                  </button>
                  <textarea
                    value={newMessage}
                    onChange={handleInputChange}
                    disabled={!canSend}
                    onPaste={(e) => {
                      const item = e.clipboardData.items[0];
                      if (item?.type.startsWith('image/')) {
                        setMediaFile(item.getAsFile());
                        e.preventDefault();
                      }
                    }}
                    placeholder={canSend ? "Message..." : "Only lecturers can post here..."}
                    className="flex-1 bg-transparent border-none text-sm py-2 px-1 max-h-32 resize-none focus:ring-0 font-medium disabled:text-slate-400"
                    rows={1}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                  />
                </div>

                {newMessage.trim() || mediaFile ? (
                  <button 
                    type="submit" 
                    disabled={isSending || !canSend}
                    className="p-3 bg-primary-600 text-white rounded-[18px] shadow-lg shadow-primary-600/30 active:scale-95 disabled:opacity-30 disabled:grayscale"
                  >
                    {isSending ? <ArrowPathIcon className="w-5 h-5 animate-spin" /> : <PaperAirplaneIcon className="w-5 h-5 -rotate-45" />}
                  </button>
                ) : (
                  <button 
                    type="button"
                    disabled={!canSend}
                    onClick={startRecording}
                    className="p-3 text-primary-600 hover:bg-primary-50 rounded-[18px] disabled:opacity-30 disabled:grayscale"
                  >
                    <MicrophoneIcon className="w-6 h-6" />
                  </button>
                )}
              </>
            ) : (
              <div className="flex-1 flex items-center justify-between bg-red-50 p-2 rounded-2xl border border-red-100">
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
