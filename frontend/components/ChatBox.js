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
  PencilIcon,
  TrashIcon,
  EllipsisHorizontalIcon,
  DocumentDuplicateIcon,
  VideoCameraIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline';
import { getCurrentUser, getInitials, getFullFileUrl } from '../utils/helpers';
import dynamic from 'next/dynamic';
import { AttachmentBubble, VoiceBubble } from './ChatMedia';
import MessageInput from './MessageInput';
import MessageList from './MessageList';
import MessageBubble from './MessageBubble';
import {
  initDB,
  cacheMessages,
  getCachedMessages,
  getOutboxMessages
} from '../utils/indexedDB';
import useOfflineChat from '../hooks/useOfflineChat';
import useChatSocket from '../hooks/useChatSocket';
import useChatMessages from '../hooks/useChatMessages';
import Markdown from 'markdown-to-jsx';
import DOMPurify from 'isomorphic-dompurify';
import { GroupedVirtuoso } from 'react-virtuoso';

export default function ChatBox({ conversationId, onMessagesUpdate, searchQuery, participants = [] }) {
  // --- Message state & operations (extracted to useChatMessages hook) ---
  const {
    messages, setMessages, loading, setLoading, error, setError,
    hasMore, isLoadingMore, isSending,
    fetchMessages, loadMoreMessages, handleSendMessage: rawHandleSendMessage,
    handleStartEdit, handleCancelEdit, handleSaveEdit, handleDeleteMessage, handleReplyTo, handleJoinCall,
    newMessage, setNewMessage, replyTo, setReplyTo,
    editingMessageId, setEditingMessageId,
    mediaFile, setMediaFile, isRecording, startRecording, stopRecording,
    handleInputChange, isOnline, syncQueue,
    currentUserIdRef, currentUserRef, isMounted,
  } = useChatMessages(conversationId, {
    onConvDataLoaded: (conversation) => {
      setConvData(conversation);
      if (conversation.type === 'COURSE' && conversation.course) {
        setIsLocked(!!conversation.course.announcementsOnly);
        const membership = conversation.course.memberships?.[0];
        setUserRole(membership?.role || 'STUDENT');
      }
    },
  });

  // --- Remaining state (UI-specific, not message logic) ---
  const [isAttachmentOpen, setIsAttachmentOpen] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [showMentionPicker, setShowMentionPicker] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [currentUser, setCurrentUser] = useState(() => getCurrentUser());

  // Socket event handlers (extracted to useChatSocket hook)
  const handleSocketNewMessage = useCallback((msg) => {
    setMessages(prev => {
      const newMsg = msg.message;
      const exists = prev.findIndex(m => m.id === newMsg.id || (m.tempId && m.tempId === newMsg.tempId));
      if (exists !== -1) {
        const updated = [...prev];
        updated[exists] = newMsg;
        return updated;
      }
      return [...prev, newMsg];
    });
  }, []);

  const handleSocketTypingUpdate = useCallback(({ userId, userName, isTyping }) => {
    setTypingUsers(prev => isTyping
      ? [...prev.filter(u => u.id !== userId), { id: userId, name: userName }]
      : prev.filter(u => u.id !== userId)
    );
  }, []);

  const handleSocketMessagesRead = useCallback((userId) => {
    setMessages(prev => prev.map(m => {
      if (m.senderId !== userId && (!m.readReceipts || !m.readReceipts.some(r => r.userId === userId))) {
        return { ...m, readReceipts: [...(m.readReceipts || []), { userId, readAt: new Date() }] };
      }
      return m;
    }));
  }, []);

  const handleSocketMessageDeleted = useCallback((messageId) => {
    setMessages(prev => prev.map(m =>
      m.id === messageId ? { ...m, isDeleted: true, content: 'This message was deleted' } : m
    ));
  }, []);

  const handleSocketMessageUpdated = useCallback((updatedMsg) => {
    setMessages(prev => prev.map(m => m.id === updatedMsg.id ? updatedMsg : m));
  }, []);

  const handleSocketReactionUpdated = useCallback(({ messageId, reactions }) => {
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, reactions } : m));
  }, []);

  const handleSocketChatCleared = useCallback(() => {
    setMessages([]);
  }, []);

  const handleSocketMessageSent = useCallback((sentMsg) => {
    setMessages(prev => prev.map(m => (m.tempId && m.tempId === sentMsg.tempId) ? sentMsg : m));
  }, []);

  const handleSocketLockUpdated = useCallback((locked) => {
    setIsLocked(locked);
  }, []);

  const [typingUsers, setTypingUsers] = useState([]);

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
  const [bgColor, setBgColor] = useState('bg-app');
  const scrollContainerRef = useRef(null);
  const fileInputRef = useRef(null);
  const convDataRef = useRef(null);
  const userRoleRef = useRef('STUDENT');
  const virtuosoRef = useRef(null);

  useEffect(() => {
    convDataRef.current = convData;
  }, [convData]);

  useEffect(() => {
    userRoleRef.current = userRole;
  }, [userRole]);

  // Socket event handling (extracted hook)
  useChatSocket(conversationId, {
    onNewMessage: handleSocketNewMessage,
    onTypingUpdate: handleSocketTypingUpdate,
    onMessagesRead: handleSocketMessagesRead,
    onMessageDeleted: handleSocketMessageDeleted,
    onMessageUpdated: handleSocketMessageUpdated,
    onReactionUpdated: handleSocketReactionUpdated,
    onChatCleared: handleSocketChatCleared,
    onMessageSent: handleSocketMessageSent,
    onLockUpdated: handleSocketLockUpdated,
    currentUserId: currentUserIdRef.current,
    convDataRef,
  });

  // --- Conversation data loading + socket join ---

  // --- 3. Effects & Initialization ---

  useEffect(() => {
    const user = getCurrentUser();
    setCurrentUser(user);
    currentUserIdRef.current = user?.id || user?._id || null;
    
    // Load background preference
    const savedBg = localStorage.getItem('chat_bg_color');
    if (savedBg) setBgColor(savedBg);
  }, []);

  // Conversation data loading + socket join (event listeners handled by useChatSocket hook)
  useEffect(() => {
    if (!conversationId) return;

    console.log(`[DEBUG] Loading conversation: ${conversationId}`);

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
    syncQueue();
    setTypingUsers([]);
  }, [conversationId]);

  // Wrap handleInputChange to also detect @ mentions
  const handleInputChangeWithMentions = useCallback((e) => {
    handleInputChange(e);
    const val = e.target.value;
    const cursorPosition = e.target.selectionStart;
    const textBeforeCursor = val.slice(0, cursorPosition);
    const match = textBeforeCursor.match(/@([\w\s]*)$/);
    if (match && !match[1].includes('  ')) {
      setShowMentionPicker(true);
      setMentionQuery(match[1].toLowerCase());
    } else {
      setShowMentionPicker(false);
    }
  }, [handleInputChange]);

  // --- Final Render ---
  const canSend = !isLocked || userRoleRef.current === 'LECTURER' || userRoleRef.current === 'COURSE_REP' || currentUser?.role === 'LECTURER' || currentUser?.role === 'ADMIN';

  return (
    <div className={`flex-1 flex flex-col min-h-0 relative h-full w-full ${bgColor} overflow-hidden`}>
      {loading ? (
        <div className="h-full flex items-center justify-center">
            <div className="flex flex-col items-center">
                <div className="w-10 h-10 border-4 border-[var(--divider)] border-t-primary-600 rounded-full"></div>
                <p className="mt-4 text-[10px] font-black text-app-muted uppercase tracking-widest">Gathering messages...</p>
            </div>
        </div>
      ) : (
        <MessageList
          messages={messages}
          conversationId={conversationId}
          searchQuery={searchQuery}
          currentUser={currentUser}
          loading={loading}
          hasMore={hasMore}
          isLoadingMore={isLoadingMore}
          page={page}
          setPage={setPage}
          fetchMessages={fetchMessages}
          activeMenuId={activeMenuId}
          setActiveMenuId={setActiveMenuId}
          editingMessageId={editingMessageId}
          onStartEdit={handleStartEdit}
          onCancelEdit={handleCancelEdit}
          onSaveEdit={handleSaveEdit}
          onDeleteMessage={handleDeleteMessage}
          onReplyTo={handleReplyTo}
          handleJoinCall={handleJoinCall}
          addReaction={addReaction}
          isNanaSession={isNanaSession}
          quickActions={QUICK_ACTIONS}
          onSendMessage={handleSendMessage}
        />
      )}

      {/* Floating Typing Indicator - moved outside scroll for visibility */}
      {typingUsers.length > 0 && (
        <div className="absolute bottom-[80px] left-4 z-30 pointer-events-none">
          <div className="flex items-center space-x-2 bg-surface/90 dark:bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-[var(--border)]/50 shadow-lg">
            <div className="flex space-x-1 items-center h-4 px-1">
              <span className="typing-dot w-1.5 h-1.5 bg-primary-600 rounded-full animate-bounce" style={{ animationDelay: '0ms', animationDuration: '0.8s' }} />
              <span className="typing-dot w-1.5 h-1.5 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '150ms', animationDuration: '0.8s' }} />
              <span className="typing-dot w-1.5 h-1.5 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '300ms', animationDuration: '0.8s' }} />
            </div>
            <span className="text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest whitespace-nowrap">
              {typingUsers.length === 1 ? `${typingUsers[0].name.split(' ')[0]} is typing` : 'Several people typing'}
            </span>
          </div>
        </div>
      )}

      {/* Footer Input Area */}
      <MessageInput
        newMessage={newMessage}
        setNewMessage={setNewMessage}
        onSendMessage={handleSendMessage}
        onInputChange={handleInputChangeWithMentions}
        replyTo={replyTo}
        onClearReply={() => setReplyTo(null)}
        mediaFile={mediaFile}
        setMediaFile={setMediaFile}
        isRecording={isRecording}
        onStartRecording={startRecording}
        onStopRecording={stopRecording}
        isSending={isSending}
        canSend={canSend}
        showEmojiPicker={showEmojiPicker}
        setShowEmojiPicker={setShowEmojiPicker}
        showMentionPicker={showMentionPicker}
        setShowMentionPicker={setShowMentionPicker}
        mentionQuery={mentionQuery}
        participants={participants}
        currentUser={currentUser}
        isInputFocused={isInputFocused}
        setIsInputFocused={setIsInputFocused}
        isNanaSession={isNanaSession}
        quickActions={QUICK_ACTIONS}
        messages={messages}
      />
    </div>
  );
}




