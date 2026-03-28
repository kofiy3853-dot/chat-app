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
  EllipsisHorizontalIcon
} from '@heroicons/react/24/outline';
import { getCurrentUser, groupMessagesByDate, getInitials, getAvatarColor } from '../utils/helpers';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import { AttachmentBubble, VoiceBubble } from './ChatMedia';

const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false });

export default function ChatBox({ conversationId }) {
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
  const [isRecording, setIsRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const [mediaFile, setMediaFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordIntervalRef = useRef(null);

  useEffect(() => {
    setCurrentUser(getCurrentUser());
  }, []);

  useEffect(() => {
    if (conversationId) {
      setLoading(true);
      setError(null);
      
      // Real-time: Join the conversation room
      const socket = getSocket();
      if (socket) {
        const joinAndSync = () => {
          socket.emit('join-conversation', conversationId);
          markAsRead(conversationId);
        };

        joinAndSync();
        // If the socket drops and reconnects, we MUST rejoin the room
        socket.on('connect', joinAndSync);
      }

      fetchMessages();
      setupSocketListeners();
    }

    return () => {
      const socket = getSocket();
      if (socket) {
        socket.off('connect'); // Clean up the rejoin listener
        // Leave room
        socket.emit('leave-conversation', conversationId);
        // Remove listeners
        socket.off('new-message');
        socket.off('user-typing');
        socket.off('message-sent');
        socket.off('error');
      }
    };
  }, [conversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, typingUsers]);

  const fetchMessages = async () => {
    try {
      const response = await chatAPI.getMessages(conversationId);
      setMessages(response.data.messages || []);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      setError('Could not load messages. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const setupSocketListeners = () => {
    const socket = getSocket();
    if (!socket) return;

    // Always remove old listeners first to prevent stacking on re-render
    socket.off('new-message');
    socket.off('message-sent');
    socket.off('user-typing');
    socket.off('error');
    
    socket.on('new-message', (data) => {
      if (data.conversationId === conversationId) {
        setMessages(prev => {
          const incoming = data.message;
          // Check for exact ID match (server confirmed message)
          const existsByRealId = prev.some(m => m.id === incoming.id);
          if (existsByRealId) {
            // Already in list — no-op
            return prev;
          }
          // Check if this replaces an optimistic (tempId) message
          if (incoming.tempId) {
            const existsByTempId = prev.some(m => m.tempId === incoming.tempId);
            if (existsByTempId) {
              return prev.map(m => m.tempId === incoming.tempId ? { ...incoming, status: 'sent' } : m);
            }
          }
          return [...prev, incoming];
        });
        markAsRead(conversationId);
      }
    });

    socket.on('message-sent', (data) => {
      // Handle confirmation of sent message — replace optimistic by tempId only
      if (!data.tempId) return;
      setMessages(prev => {
        const alreadyReplaced = prev.some(m => m.id === data.message?.id && !m.tempId);
        if (alreadyReplaced) return prev;
        return prev.map(m =>
          m.tempId === data.tempId ? { ...data.message, status: 'sent' } : m
        );
      });
    });

    socket.on('user-typing', (data) => {
      if (data.conversationId === conversationId) {
        if (data.isTyping) {
          setTypingUsers(prev => {
            if (!prev.find(u => u.userId === data.userId)) {
              return [...prev, { userId: data.userId, userName: data.userName }];
            }
            return prev;
          });
        } else {
          setTypingUsers(prev => prev.filter(u => u.userId !== data.userId));
        }
      }
    });

    socket.on('error', (err) => {
      console.error('Socket error:', err);
    });

    socket.on('message-updated', (data) => {
      setMessages(prev => prev.map(m => m.id === data.message.id ? data.message : m));
    });

    socket.on('message-deleted', (data) => {
      setMessages(prev => prev.map(m => 
        m.id === data.messageId ? { ...m, isDeleted: true, content: 'This message was deleted' } : m
      ));
    });

    socket.on('reaction-updated', (data) => {
      setMessages(prev => prev.map(m => 
        m.id === data.messageId ? { ...m, reactions: data.reactions } : m
      ));
    });
  };

  const handleEditMessage = (e) => {
    if (e) e.preventDefault();
    if (!editingContent.trim() || !editingMessageId) return;

    editMessage(editingMessageId, editingContent.trim());
    setEditingMessageId(null);
    setEditingContent('');
  };

  const handleDeleteMessage = (messageId) => {
    if (window.confirm('Delete this message?')) {
      deleteMessage(messageId);
      setActiveMenuId(null);
    }
  };

  const handleAddReaction = (messageId, emoji) => {
    addReaction(messageId, emoji);
    setActiveMenuId(null);
  };

  const startRecording = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Microphone access requires a secure HTTPS connection or localhost.");
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const mimeType = mediaRecorderRef.current.mimeType || 'audio/webm';
        // Improved extension detection based on the actual recorded mimeType
        let extension = 'mp3';
        if (mimeType.includes('webm')) extension = 'webm';
        else if (mimeType.includes('ogg')) extension = 'ogg';
        else if (mimeType.includes('mp4') || mimeType.includes('m4a')) extension = 'm4a';

        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        const voiceFile = new File([audioBlob], `voice-note-${Date.now()}.${extension}`, { type: mimeType });
        
        console.log(`Voice note recording complete. Size: ${voiceFile.size} bytes, Type: ${mimeType}, Ext: ${extension}`);
        handleUploadMedia(voiceFile, 'VOICE');
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordTime(0);
      recordIntervalRef.current = setInterval(() => {
        setRecordTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Failed to start recording:', err);
      alert('Microphone access denied or not available');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(recordIntervalRef.current);
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const isImage = file.type.startsWith('image/');
      handleUploadMedia(file, isImage ? 'IMAGE' : 'FILE');
    }
  };

  const handleUploadMedia = async (file, type) => {
    if (!file || uploading) return;
    
    setUploading(true);
    const tempId = Date.now().toString();

    // Optimistic Update
    const optimisticMessage = {
      id: tempId,
      tempId,
      content: type === 'VOICE' ? 'Voice memo' : file.name,
      senderId: currentUser.id,
      sender: currentUser,
      createdAt: new Date().toISOString(),
      status: 'sending',
      type,
      fileName: file.name,
      fileSize: file.size
    };

    setMessages(prev => [...prev, optimisticMessage]);

    try {
      const formData = new FormData();
      formData.append(type === 'VOICE' ? 'voice' : 'file', file);
      formData.append('conversationId', conversationId);
      formData.append('type', type);
      formData.append('tempId', tempId);

      const response = await chatAPI.uploadMessageAttachment(formData);
      
      // Removed redundant socket.emit('send-message') because the backend already 
      // broadcasts 'new-message' to the conversation room upon successful upload.

    } catch (err) {
      setMessages(prev => prev.map(m => 
        m.tempId === tempId ? { ...m, status: 'error' } : m
      ));
    } finally {
      setUploading(false);
    }
  };

  const scrollToBottom = (instant = false) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: instant ? 'auto' : 'smooth' });
    }
  };

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!newMessage.trim() || isSending) return;

    const tempId = Date.now().toString();
    const messageContent = newMessage.trim();
    
    // Optimistic Update
    const optimisticMessage = {
      id: tempId,
      tempId,
      content: messageContent,
      senderId: currentUser.id,
      sender: currentUser,
      createdAt: new Date().toISOString(),
      status: 'sending'
    };

    setMessages(prev => [...prev, optimisticMessage]);
    setNewMessage('');
    setShowEmojiPicker(false);
    handleTypingStop();

    try {
      sendMessage({
        conversationId,
        content: messageContent,
        type: 'TEXT',
        tempId // Pass back so we can match it
      });
    } catch (err) {
      setMessages(prev => prev.map(m => 
        m.tempId === tempId ? { ...m, status: 'error' } : m
      ));
    }
  };

  const handleTypingStart = () => {
    sendTyping(conversationId, true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(handleTypingStop, 3000);
  };

  const handleTypingStop = () => {
    sendTyping(conversationId, false);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
  };

  const onEmojiClick = (emojiData) => {
    setNewMessage(prev => prev + emojiData.emoji);
  };

  const groupedMessages = useMemo(() => groupMessagesByDate(messages), [messages]);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="relative">
          <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
          <div className="mt-4 text-gray-500 font-medium animate-pulse">Loading messages...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mb-4">
          <ArrowPathIcon className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-gray-900">{error}</h3>
        <button 
          onClick={fetchMessages}
          className="mt-4 px-6 py-2 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 transition-all"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#F8FAFC]">
      {/* Messages List */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-4 py-6 space-y-8 scrollbar-hide"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full opacity-60">
            <div className="w-20 h-20 bg-primary-50 rounded-full flex items-center justify-center mb-4">
              <ChatBubbleLeftIcon className="w-10 h-10 text-primary-400" />
            </div>
            <p className="text-lg font-bold text-gray-400">Start the conversation</p>
            <p className="text-sm text-gray-400">Say hi to your classmate! 👋</p>
          </div>
        ) : (
          Object.entries(groupedMessages).map(([date, dateMessages]) => (
            <div key={date} className="space-y-6">
              <div className="flex justify-center sticky top-0 z-0">
                <span className="text-[10px] font-bold text-gray-400 bg-white/80 backdrop-blur-sm border border-gray-100 px-3 py-1 rounded-full uppercase tracking-widest shadow-sm">
                  {isToday(new Date(date)) ? 'Today' : isYesterday(new Date(date)) ? 'Yesterday' : format(new Date(date), 'MMMM d, yyyy')}
                </span>
              </div>
              
              <div className="space-y-4">
                {dateMessages.map((message, idx) => {
                  const isMine = message.senderId === currentUser?.id || message.sender?.id === currentUser?.id;
                  const showSender = !isMine && (idx === 0 || dateMessages[idx-1].senderId !== message.senderId);
                  
                  return (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.2 }}
                      key={message.id || message.tempId}
                      className={`flex items-end mb-4 ${isMine ? 'flex-row-reverse space-x-reverse' : 'flex-row'} space-x-2`}
                    >
                      {/* Interaction Badge / Avatar */}
                      {!isMine && (
                        <div className={`flex-shrink-0 mb-1 transition-opacity ${showSender ? 'opacity-100' : 'opacity-0'}`}>
                           <div className={`w-8 h-8 rounded-[11px] bg-gradient-to-tr ${getAvatarColor(message.sender?.name || 'User')} flex items-center justify-center text-white text-[10px] font-black shadow-sm`}>
                             {getInitials(message.sender?.name || 'U')}
                           </div>
                        </div>
                      )}

                      <div className={`flex flex-col max-w-[75%] ${isMine ? 'items-end' : 'items-start'}`}>
                        {showSender && !isMine && (
                          <span className="text-[10px] font-black text-slate-400 mb-1 ml-1 uppercase tracking-tight">
                            {message.sender?.name}
                          </span>
                        )}
                        <div
                          className={`group relative px-4 py-2.5 rounded-2xl shadow-sm ${
                            isMine
                              ? 'bg-primary-600 text-white rounded-tr-none'
                              : 'bg-white text-slate-800 rounded-tl-none border border-slate-100'
                          }`}
                        >
                          {/* Media Handling */}
                          {editingMessageId === message.id ? (
                            <form onSubmit={handleEditMessage} className="min-w-[200px]">
                              <textarea
                                value={editingContent}
                                onChange={(e) => setEditingContent(e.target.value)}
                                className={`w-full bg-transparent border-none focus:ring-0 p-0 text-sm sm:text-base resize-none ${isMine ? 'text-white' : 'text-slate-800'}`}
                                autoFocus
                                rows={Math.max(1, editingContent.split('\n').length)}
                              />
                              <div className="flex justify-end space-x-2 mt-2">
                                <button 
                                  type="button" 
                                  onClick={() => setEditingMessageId(null)}
                                  className={`text-[10px] font-bold px-2 py-1 rounded-lg ${isMine ? 'bg-primary-700 text-white' : 'bg-slate-100 text-slate-600'}`}
                                >
                                  Cancel
                                </button>
                                <button 
                                  type="submit"
                                  className={`text-[10px] font-bold px-2 py-1 rounded-lg ${isMine ? 'bg-white text-primary-600' : 'bg-primary-600 text-white'}`}
                                >
                                  Save
                                </button>
                              </div>
                            </form>
                          ) : message.isDeleted ? (
                            <p className="text-sm italic opacity-60">This message was deleted</p>
                          ) : message.type === 'VOICE' ? (
                            <VoiceBubble message={message} />
                          ) : (message.type === 'IMAGE' || message.type === 'FILE') ? (
                            <AttachmentBubble message={message} />
                          ) : (
                            <p className="text-sm sm:text-base leading-relaxed whitespace-pre-wrap font-medium">{message.content}</p>
                          )}
                          
                          {/* Reactions Display */}
                          {message.reactions && message.reactions.length > 0 && !message.isDeleted && (
                            <div className={`flex flex-wrap gap-1 mt-2 ${isMine ? 'justify-end' : 'justify-start'}`}>
                              {Object.entries(
                                message.reactions.reduce((acc, r) => {
                                  acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                                  return acc;
                                }, {})
                              ).map(([emoji, count]) => {
                                const didIReact = message.reactions.some(r => r.userId === currentUser?.id && r.emoji === emoji);
                                return (
                                  <button
                                    key={emoji}
                                    onClick={() => handleAddReaction(message.id, emoji)}
                                    className={`flex items-center space-x-1 px-1.5 py-0.5 rounded-full text-[10px] border transition-all ${
                                      didIReact 
                                        ? 'bg-primary-50 border-primary-200 text-primary-600 shadow-sm' 
                                        : 'bg-white border-slate-100 text-slate-500 hover:border-slate-200'
                                    }`}
                                  >
                                    <span>{emoji}</span>
                                    {count > 1 && <span>{count}</span>}
                                  </button>
                                );
                              })}
                            </div>
                          )}

                          <div className={`flex items-center space-x-1 mt-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
                            {message.editedAt && !message.isDeleted && (
                              <span className={`text-[9px] italic font-medium mr-1 ${isMine ? 'text-primary-200' : 'text-slate-400'}`}>edited</span>
                            )}
                            <span className={`text-[9px] font-bold tracking-tighter ${isMine ? 'text-primary-100' : 'text-slate-400'}`}>
                              {format(new Date(message.createdAt), 'h:mm a')}
                            </span>
                            {isMine && message.status === 'sending' && (
                              <ArrowPathIcon className="w-2.5 h-2.5 animate-spin text-primary-200" />
                            )}
                            {isMine && message.status !== 'sending' && !message.isDeleted && (
                              <CheckIcon className={`w-3 h-3 ${message.isRead ? 'text-emerald-300' : 'text-primary-200'}`} />
                            )}
                          </div>

                          {/* Message Actions Button (Dropdown) */}
                          {!message.isDeleted && !editingMessageId && (
                            <div className={`absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1 ${isMine ? '-left-12' : '-right-12'}`}>
                              <button 
                                onClick={() => setActiveMenuId(activeMenuId === message.id ? null : message.id)}
                                className={`p-1.5 rounded-full bg-white shadow-sm border border-slate-100 text-slate-400 hover:text-slate-600 transition-all ${activeMenuId === message.id ? 'opacity-100 scale-110' : ''}`}
                              >
                                <EllipsisHorizontalIcon className="w-4 h-4" />
                              </button>
                            </div>
                          )}

                          {/* Action Menu Popover */}
                          <AnimatePresence>
                            {activeMenuId === message.id && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                className={`absolute z-[100] bottom-full mb-2 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden min-w-[140px] ${isMine ? 'right-0' : 'left-0'}`}
                              >
                                {/* Quick Reactions */}
                                <div className="flex items-center justify-around p-2 border-b border-slate-50 bg-slate-50/50">
                                  {['❤️', '👍', '🔥', '😂', '😮', '😢'].map(emoji => (
                                    <button
                                      key={emoji}
                                      onClick={() => handleAddReaction(message.id, emoji)}
                                      className="hover:scale-125 transition-transform p-1 text-base"
                                    >
                                      {emoji}
                                    </button>
                                  ))}
                                </div>
                                <div className="p-1">
                                  {isMine && (
                                    <>
                                      <button 
                                        onClick={() => {
                                          setEditingMessageId(message.id);
                                          setEditingContent(message.content);
                                          setActiveMenuId(null);
                                        }}
                                        className="w-full flex items-center space-x-2 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 rounded-xl transition-colors"
                                      >
                                        <PencilIcon className="w-4 h-4" />
                                        <span>Edit Message</span>
                                      </button>
                                      <button 
                                        onClick={() => handleDeleteMessage(message.id)}
                                        className="w-full flex items-center space-x-2 px-3 py-2 text-xs font-bold text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                                      >
                                        <TrashIcon className="w-4 h-4" />
                                        <span>Delete</span>
                                      </button>
                                    </>
                                  )}
                                  <button 
                                    className="w-full flex items-center space-x-2 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 rounded-xl transition-colors"
                                    onClick={() => setActiveMenuId(null)}
                                  >
                                    <FaceSmileIcon className="w-4 h-4" />
                                    <span>Add Emoji...</span>
                                  </button>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))
        )}
        
        {/* Typing indicator */}
        <AnimatePresence>
          {typingUsers.length > 0 && typingUsers.some(u => u.userId !== currentUser?.id) && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="flex justify-start pt-2"
            >
              <div className="bg-white/80 backdrop-blur-sm border border-slate-100 px-4 py-2 rounded-2xl rounded-tl-none shadow-sm flex items-center space-x-2">
                <div className="flex space-x-1">
                  <span className="w-1 h-1 bg-primary-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                  <span className="w-1 h-1 bg-primary-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                  <span className="w-1 h-1 bg-primary-400 rounded-full animate-bounce"></span>
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                  {typingUsers.filter(u => u.userId !== currentUser?.id)[0].userName} is typing
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        <div ref={messagesEndRef} className="h-4" />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-slate-100 shadow-[0_-4px_20px_rgba(0,0,0,0.03)] relative z-20">
        <form onSubmit={handleSendMessage} className="max-w-xl mx-auto flex items-center space-x-3">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            className="hidden" 
          />
          
          <div className="flex-1 relative flex items-center">
            {isRecording ? (
              <div className="flex-1 flex items-center bg-red-50 px-4 py-3 rounded-2xl">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse mr-3"></div>
                <span className="text-xs font-black text-red-600 uppercase tracking-widest flex-1">
                  Recording {Math.floor(recordTime / 60)}:{(recordTime % 60).toString().padStart(2, '0')}
                </span>
                <button 
                  type="button" 
                  onClick={stopRecording}
                  className="p-1.5 bg-red-600 text-white rounded-xl shadow-lg shadow-red-500/30"
                >
                  <StopCircleIcon className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className={`p-2 rounded-xl transition-all ${showEmojiPicker ? 'text-primary-600 bg-primary-50' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  <FaceSmileIcon className="w-6 h-6 stroke-2" />
                </button>
                
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value);
                    handleTypingStart();
                  }}
                  onFocus={() => setShowEmojiPicker(false)}
                  onBlur={handleTypingStop}
                  placeholder="Write a message..."
                  className="flex-1 bg-slate-50 border-none px-4 py-3 rounded-2xl focus:ring-2 focus:ring-primary-500/20 text-slate-800 text-sm sm:text-base transition-all placeholder:text-slate-400"
                />
                
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute right-3 p-1.5 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <PaperClipIcon className="w-5 h-5 stroke-2" />
                </button>
              </>
            )}
          </div>
          
          {(!newMessage.trim() && !isRecording) ? (
            <button
              type="button"
              onClick={startRecording}
              className="flex items-center justify-center w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 hover:text-primary-600 hover:bg-primary-50 active:scale-95 transition-all"
            >
              <MicrophoneIcon className="w-6 h-6 stroke-2" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!newMessage.trim() || isSending}
              className={`flex items-center justify-center w-12 h-12 rounded-2xl transition-all duration-300 transform active:scale-90 ${
                newMessage.trim() 
                  ? 'bg-primary-600 text-white shadow-[0_8_20px_rgba(37,99,235,0.3)] hover:bg-primary-700 hover:-translate-y-0.5' 
                  : 'bg-slate-100 text-slate-300'
              }`}
            >
              <PaperAirplaneIcon className="w-6 h-6 stroke-2" />
            </button>
          )}
        </form>

        {/* Emoji Picker Overlay */}
        <AnimatePresence>
          {showEmojiPicker && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-24 left-4 z-50 shadow-2xl rounded-2xl overflow-hidden border border-slate-100"
            >
              <EmojiPicker 
                onEmojiClick={onEmojiClick} 
                autoFocusSearch={false}
                searchDisabled
                skinTonesDisabled
                width={300}
                height={350}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
