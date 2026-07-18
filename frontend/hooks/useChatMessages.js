import { useState, useRef, useCallback, useEffect } from 'react';
import { chatAPI } from '../services/api';
import { sendMessage, editMessage, deleteMessage, sendTyping } from '../services/socket';
import { getCurrentUser, compressImage } from '../utils/helpers';
import { cacheMessages, getCachedMessages, getOutboxMessages } from '../utils/indexedDB';
import useOfflineChat from './useOfflineChat';

/**
 * Manages all message state, loading, sending, and editing operations.
 * Separates data logic from UI rendering.
 *
 * @param {string} conversationId - The active conversation ID
 * @param {object} options
 * @param {function} options.onConvDataLoaded - Called when conversation metadata is loaded
 * @param {function} options.onLockUpdated - Called when course lock status changes
 * @param {function} options.onUserRoleUpdated - Called when user's role in course changes
 */
export default function useChatMessages(conversationId, {
  onConvDataLoaded,
  onLockUpdated,
  onUserRoleUpdated,
} = {}) {
  const [messages, setMessages] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSending, setIsSending] = useState(false);

  // Input state
  const [newMessage, setNewMessage] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [editingMessageId, setEditingMessageId] = useState(null);

  // Media state
  const [mediaFile, setMediaFile] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const audioChunksRef = useRef([]);

  // Typing state
  const typingTimeoutRef = useRef(null);
  const isCurrentlyTyping = useRef(false);

  // Refs
  const isFetchingRef = useRef(false);
  const isMounted = useRef(true);
  const currentUserIdRef = useRef(getCurrentUser()?.id || null);
  const currentUserRef = useRef(getCurrentUser());

  // Offline support
  const { isOnline, sendWithQueue, syncQueue } = useOfflineChat(conversationId, async (msg) => {
    if (!msg.fileUrl) {
      sendMessage({
        conversationId: msg.conversationId,
        content: msg.content,
        tempId: msg.tempId,
        replyToId: msg.replyToId
      });
    }
  });

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  // --- Message Loading ---

  const fetchMessages = useCallback(async (currentPage = 1, append = false) => {
    if (!conversationId || isFetchingRef.current) return;

    isFetchingRef.current = true;
    try {
      if (append) setIsLoadingMore(true);
      const response = await chatAPI.getMessages(conversationId, currentPage, 50);
      const newMessages = response.data.messages || [];
      const conversation = response.data.conversation;

      if (!isMounted.current) return;

      setHasMore(response.data.hasMore ?? newMessages.length === 50);

      if (conversation && !append) {
        onConvDataLoaded?.(conversation);
      }

      setMessages(prev => {
        const outbox = prev.filter(m => m.id?.toString().startsWith('temp'));
        if (append) {
          const existingIds = new Set(prev.map(m => m.id));
          const uniqueNew = newMessages.filter(m => !existingIds.has(m.id));
          return [...uniqueNew, ...prev.filter(m => !m.id?.toString().startsWith('temp')), ...outbox];
        }
        return [...newMessages, ...outbox];
      });

      if (!append) {
        await cacheMessages(conversationId, newMessages);
      }
    } catch (err) {
      if (isMounted.current && !append) {
        setError('Failed to load chat');
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
        setIsLoadingMore(false);
      }
      isFetchingRef.current = false;
    }
  }, [conversationId, onConvDataLoaded]);

  const loadMoreMessages = useCallback(() => {
    if (hasMore && !isLoadingMore) {
      setPage(prev => prev + 1);
      fetchMessages(page + 1, true);
    }
  }, [hasMore, isLoadingMore, page, fetchMessages]);

  // --- Message Sending ---

  const handleSendMessage = useCallback(async (e, overrideContent = null) => {
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

    const currentUser = currentUserRef.current;
    const msgData = {
      id: tempId,
      tempId,
      content: contentToSend.trim(),
      senderId: currentUser?.id || currentUser?._id,
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

    setIsSending(true);

    try {
      await sendWithQueue(msgData, async (data) => {
        if (mediaFile) {
          const fd = new FormData();
          const fileType = mediaFile.type.startsWith('image/') ? 'IMAGE' : (mediaFile.type.startsWith('audio/') ? 'VOICE' : 'FILE');
          let fileToUpload = mediaFile;
          if (mediaFile.type.startsWith('image/')) {
            try {
              fileToUpload = await compressImage(mediaFile);
            } catch (err) {
              console.warn('Compression failed, uploading original', err);
            }
          }

          fd.append('file', fileToUpload);
          fd.append('conversationId', conversationId);
          fd.append('content', data.content);
          fd.append('type', fileType);
          fd.append('tempId', tempId);
          if (replyTo?.id) fd.append('replyToId', replyTo.id);

          await chatAPI.uploadMessageAttachment(fd);
        } else {
          sendMessage({ conversationId, content: data.content, tempId, replyToId: replyTo?.id });
        }
      });
    } catch (err) {
      console.error('[DEBUG] Send error:', err);
    } finally {
      setIsSending(false);
    }
  }, [newMessage, mediaFile, isSending, isRecording, replyTo, conversationId, sendWithQueue]);

  // --- Voice Recording ---

  const startRecording = useCallback(async () => {
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
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setIsRecording(false);
      setMediaRecorder(null);
    }
  }, [mediaRecorder]);

  const sendVoiceNote = useCallback(async (blob, extension = 'webm') => {
    const tempId = `temp-${Date.now()}`;
    const voiceFile = new File([blob], `voicenote.${extension}`, { type: blob.type });
    const currentUser = currentUserRef.current;

    const msgData = {
      id: tempId,
      tempId,
      senderId: currentUser?.id,
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
  }, [conversationId]);

  // --- Message Operations ---

  const handleStartEdit = useCallback((msgId) => {
    setEditingMessageId(msgId);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingMessageId(null);
  }, []);

  const handleSaveEdit = useCallback((msgId, content) => {
    if (!content.trim()) return;
    editMessage(msgId, content.trim());
    setEditingMessageId(null);
  }, []);

  const handleDeleteMessage = useCallback((msgId) => {
    if (!msgId || msgId.toString().startsWith('temp')) return;
    if (!window.confirm('Delete this message?')) return;
    setMessages(prev => prev.map(m =>
      m.id === msgId ? { ...m, isDeleted: true, content: 'This message was deleted' } : m
    ));
    deleteMessage(msgId);
  }, []);

  const handleReplyTo = useCallback((msg) => {
    if (msg?.isDeleted) return;
    setReplyTo(msg);
    if (navigator.vibrate) navigator.vibrate(20);
  }, []);

  // --- Input & Typing ---

  const handleInputChange = useCallback((e) => {
    const val = e.target.value;
    setNewMessage(val);

    if (val.trim().length === 0) {
      if (isCurrentlyTyping.current) {
        isCurrentlyTyping.current = false;
        sendTyping(conversationId, false);
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      return;
    }

    if (!isCurrentlyTyping.current) {
      isCurrentlyTyping.current = true;
      sendTyping(conversationId, true);
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      isCurrentlyTyping.current = false;
      sendTyping(conversationId, false);
    }, 2000);
  }, [conversationId]);

  const handleJoinCall = useCallback((content) => {
    const cid = content.split('call/')[1]?.split(' ')[0];
    if (cid) window.open(`/call/${cid}`, '_blank');
  }, []);

  return {
    // Message state
    messages,
    setMessages,
    loading,
    setLoading,
    error,
    setError,
    hasMore,
    isLoadingMore,
    isSending,

    // Message operations
    fetchMessages,
    loadMoreMessages,
    handleSendMessage,
    handleStartEdit,
    handleCancelEdit,
    handleSaveEdit,
    handleDeleteMessage,
    handleReplyTo,
    handleJoinCall,

    // Input state
    newMessage,
    setNewMessage,
    replyTo,
    setReplyTo,
    editingMessageId,
    setEditingMessageId,

    // Media state
    mediaFile,
    setMediaFile,
    isRecording,
    startRecording,
    stopRecording,

    // Typing
    handleInputChange,

    // Offline
    isOnline,
    syncQueue,

    // Refs
    currentUserIdRef,
    currentUserRef,
    isMounted,
  };
}
