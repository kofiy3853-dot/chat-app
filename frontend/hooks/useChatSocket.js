import { useEffect, useRef, useCallback } from 'react';
import { getSocket, markAsRead } from '../services/socket';

/**
 * Manages all Socket.IO event listeners for a chat conversation.
 * Handles: new messages, typing indicators, read receipts, message updates/deletes,
 * reactions, chat clearing, lock updates, and reconnection re-joins.
 *
 * @param {string} conversationId - The active conversation ID
 * @param {object} options
 * @param {function} options.onNewMessage - Called when a new message arrives
 * @param {function} options.onTypingUpdate - Called when typing status changes
 * @param {function} options.onMessagesRead - Called when messages are marked read
 * @param {function} options.onMessageDeleted - Called when a message is deleted
 * @param {function} options.onMessageUpdated - Called when a message is edited
 * @param {function} options.onReactionUpdated - Called when reactions change
 * @param {function} options.onChatCleared - Called when chat is cleared
 * @param {function} options.onMessageSent - Called when a sent message is confirmed
 * @param {function} options.onLockUpdated - Called when course chat lock changes
 * @param {function} options.currentUserId - Current user's ID for filtering
 */
export default function useChatSocket(conversationId, {
  onNewMessage,
  onTypingUpdate,
  onMessagesRead,
  onMessageDeleted,
  onMessageUpdated,
  onReactionUpdated,
  onChatCleared,
  onMessageSent,
  onLockUpdated,
  currentUserId,
  convDataRef,
}) {
  const callbacksRef = useRef({});
  callbacksRef.current = {
    onNewMessage,
    onTypingUpdate,
    onMessagesRead,
    onMessageDeleted,
    onMessageUpdated,
    onReactionUpdated,
    onChatCleared,
    onMessageSent,
    onLockUpdated,
  };

  useEffect(() => {
    if (!conversationId) return;

    const socket = getSocket();
    if (!socket) return;

    // Join the conversation room
    if (socket.connected) {
      socket.emit('join-conversation', conversationId);
      socket.emit('join-conversations');
    }

    const handleNewMessage = (msg) => {
      // eslint-disable-next-line eqeqeq
      if (msg.conversationId == conversationId) {
        callbacksRef.current.onNewMessage?.(msg);
        markAsRead(conversationId);
      }
    };

    const handleUserTyping = ({ userId, userName, isTyping, conversationId: cid }) => {
      // eslint-disable-next-line eqeqeq
      if (cid != conversationId) return;
      callbacksRef.current.onTypingUpdate?.({ userId, userName, isTyping });
    };

    const handleMessagesRead = ({ userId, conversationId: cid }) => {
      // eslint-disable-next-line eqeqeq
      if (cid == conversationId) {
        callbacksRef.current.onMessagesRead?.(userId);
      }
    };

    const handleMessageDeleted = ({ messageId }) => {
      callbacksRef.current.onMessageDeleted?.(messageId);
    };

    const handleChatCleared = ({ conversationId: cid }) => {
      // eslint-disable-next-line eqeqeq
      if (cid == conversationId) callbacksRef.current.onChatCleared?.();
    };

    const handleMessageSent = (sent) => {
      callbacksRef.current.onMessageSent?.(sent.message || sent);
    };

    const handleLockUpdated = ({ locked, courseId }) => {
      const convData = convDataRef?.current;
      if (convData?.courseId === courseId || convData?.course?.id === courseId) {
        callbacksRef.current.onLockUpdated?.(locked);
      }
    };

    const handleReactionUpdated = ({ messageId, reactions }) => {
      callbacksRef.current.onReactionUpdated?.({ messageId, reactions });
    };

    const handleMessageUpdated = ({ message: updatedMsg }) => {
      callbacksRef.current.onMessageUpdated?.(updatedMsg);
    };

    // Reconnection handler
    const handleOnConnect = () => {
      socket.emit('join-conversations');
      socket.emit('join-conversation', conversationId);
    };

    // Register all listeners
    socket.on('connect', handleOnConnect);
    socket.on('new-message', handleNewMessage);
    socket.on('user-typing', handleUserTyping);
    socket.on('messages-read', handleMessagesRead);
    socket.on('message-deleted', handleMessageDeleted);
    socket.on('message-updated', handleMessageUpdated);
    socket.on('reaction-updated', handleReactionUpdated);
    socket.on('chat-cleared', handleChatCleared);
    socket.on('message-sent', handleMessageSent);
    socket.on('chat-lock-updated', handleLockUpdated);

    return () => {
      socket.emit('leave-conversation', conversationId);
      socket.off('connect', handleOnConnect);
      socket.off('new-message', handleNewMessage);
      socket.off('user-typing', handleUserTyping);
      socket.off('messages-read', handleMessagesRead);
      socket.off('message-deleted', handleMessageDeleted);
      socket.off('message-updated', handleMessageUpdated);
      socket.off('reaction-updated', handleReactionUpdated);
      socket.off('chat-cleared', handleChatCleared);
      socket.off('message-sent', handleMessageSent);
      socket.off('chat-lock-updated', handleLockUpdated);
    };
  }, [conversationId]);
}
