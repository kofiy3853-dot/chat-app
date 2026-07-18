import React, { useRef, useCallback, useEffect, useMemo } from 'react';
import { GroupedVirtuoso } from 'react-virtuoso';
import { ChevronDownIcon, ChatBubbleLeftIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { formatMessageTime, groupMessagesByDate } from '../utils/helpers';

/**
 * Message list with virtualized scrolling, date separators, and scroll management.
 */
export default function MessageList({
  messages,
  conversationId,
  searchQuery,
  currentUser,
  loading,
  hasMore,
  isLoadingMore,
  page,
  setPage,
  fetchMessages,
  activeMenuId,
  setActiveMenuId,
  editingMessageId,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDeleteMessage,
  onReplyTo,
  handleJoinCall,
  isNanaSession,
  quickActions,
  onSendMessage,
}) {
  const virtuosoRef = useRef(null);
  const [showScrollBottom, setShowScrollBottom] = React.useState(false);
  const isAtBottomRef = useRef(true);
  const pendingScrollRef = useRef(false);

  // Scroll management refs
  const isFirstLoad = useRef(true);
  const prevMsgCount = useRef(0);
  const prevFirstMsgId = useRef(null);

  // Group messages by date
  const groupedData = useMemo(() => {
    const filtered = searchQuery
      ? messages.filter(m => m.content && m.content.toLowerCase().includes(searchQuery.toLowerCase()))
      : messages;

    const sorted = [...filtered].sort((a, b) => {
      const dateA = new Date(a.createdAt || a.timestamp);
      const dateB = new Date(b.createdAt || b.timestamp);
      return dateA - dateB;
    });

    const groups = groupMessagesByDate(sorted);
    const sortedDates = Object.keys(groups).sort((a, b) => new Date(a) - new Date(b));

    const groupCounts = [];
    const flattened = [];

    sortedDates.forEach(date => {
      const msgs = groups[date];
      groupCounts.push(msgs.length);
      flattened.push(...msgs);
    });

    return { groupCounts, sortedDates, flattened };
  }, [messages, searchQuery]);

  // Scroll to bottom using Virtuoso API
  const scrollToBottom = useCallback((behavior = 'auto') => {
    if (virtuosoRef.current) {
      const lastIndex = groupedData.flattened.length - 1;
      if (lastIndex >= 0) {
        virtuosoRef.current.scrollToIndex({
          index: lastIndex,
          align: 'end',
          behavior
        });
      }
    }
  }, [groupedData.flattened.length]);

  // Main scroll effect — always stay at bottom like WhatsApp
  useEffect(() => {
    if (groupedData.flattened.length === 0) return;

    const isNewMessage = groupedData.flattened.length > prevMsgCount.current;
    const lastMsg = groupedData.flattened[groupedData.flattened.length - 1];
    const isMyMessage = lastMsg?.senderId === currentUser?.id;

    if (isFirstLoad.current) {
      scrollToBottom('auto');
      isFirstLoad.current = false;
    } else if (isNewMessage) {
      // Always scroll to bottom for YOUR messages (like WhatsApp)
      // For others' messages, only scroll if already at bottom
      if (isMyMessage || isAtBottomRef.current) {
        scrollToBottom('auto');
      } else {
        pendingScrollRef.current = true;
      }
    }

    prevMsgCount.current = groupedData.flattened.length;
    prevFirstMsgId.current = groupedData.flattened[0]?.id;
  }, [groupedData.flattened.length, conversationId, scrollToBottom, currentUser?.id]);

  // Reset flags when switching conversations
  useEffect(() => {
    isFirstLoad.current = true;
    prevMsgCount.current = 0;
    prevFirstMsgId.current = null;
  }, [conversationId]);

  // Empty states
  if (!conversationId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-surface-2/30">
        <div className="w-20 h-20 rounded-3xl bg-surface flex items-center justify-center mb-6 border border-[var(--border)]/50">
          <ChatBubbleLeftIcon className="w-10 h-10 text-primary-400" />
        </div>
        <h3 className="text-lg font-black text-app-primary tracking-tight">Select a conversation</h3>
        <p className="text-xs text-app-secondary font-bold mt-2 max-w-xs leading-relaxed uppercase tracking-wider">Choose a contact from your inbox to start a secure encrypted chat session.</p>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
        <div className="w-12 h-12 rounded-2xl bg-surface-2 flex items-center justify-center mb-3 border border-[var(--border)]/50">
          <SparklesIcon className="w-6 h-6 text-primary-600" />
        </div>
        <h3 className="text-sm font-black text-app-primary tracking-tight">
          {isNanaSession ? "Nana is here to help!" : "No messages yet"}
        </h3>
        <p className="text-[10px] text-app-secondary font-bold mt-1 max-w-[240px] leading-relaxed uppercase tracking-widest">
          {isNanaSession
            ? "Ask about courses, food, or campus events."
            : "Your conversation history will appear here."}
        </p>

        {isNanaSession && (
          <div className="mt-4 grid grid-cols-1 gap-1.5 w-full max-w-xs">
            {quickActions.slice(0, 3).map((action, idx) => (
              <button
                key={idx}
                onClick={() => onSendMessage(null, action.query)}
                className="p-2 bg-surface border border-[var(--border)]/50 rounded-xl text-[10px] font-black text-app-primary text-left flex items-center gap-2 group"
              >
                <span>{action.label.split(' ')[0]}</span>
                <span>{action.label.split(' ').slice(1).join(' ')}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 relative h-full w-full overflow-hidden">
      <GroupedVirtuoso
        ref={virtuosoRef}
        groupCounts={groupedData.groupCounts}
        groupContent={(index) => (
          <div className="flex justify-center my-6">
            <span className="bg-surface/90 backdrop-blur px-3 py-1 rounded-full border border-[var(--border)]/50 text-[9px] font-black text-app-secondary uppercase tracking-widest">
              {formatMessageTime(groupedData.sortedDates[index])}
            </span>
          </div>
        )}
        itemContent={(index, groupIndex) => {
          const msg = groupedData.flattened[index];
          if (!msg) return null;

          let isNewSender = true;
          if (index > 0) {
            const prevMsg = groupedData.flattened[index - 1];
            const itemsInPrevGroups = groupedData.groupCounts.slice(0, groupIndex).reduce((a, b) => a + b, 0);
            const indexInGroup = index - itemsInPrevGroups;
            if (indexInGroup > 0) {
              isNewSender = prevMsg.senderId !== msg.senderId;
            }
          }

          return (
            <div className="px-4">
              <MessageBubble
                key={msg.id || msg.tempId}
                message={msg}
                isMine={msg.senderId === currentUser?.id || msg.sender?.id === currentUser?.id}
                showSender={isNewSender && msg.senderId !== currentUser?.id}
                currentUser={currentUser}
                isActiveMenu={activeMenuId === (msg.id || msg.tempId)}
                setActiveMenuId={setActiveMenuId}
                isEditing={editingMessageId === (msg.id || msg.tempId)}
                onStartEdit={onStartEdit}
                onCancelEdit={onCancelEdit}
                onSaveEdit={onSaveEdit}
                addReaction={addReaction}
                deleteMessage={onDeleteMessage}
                handleJoinCall={handleJoinCall}
                onReply={onReplyTo}
                showTail={isNewSender}
              />
            </div>
          );
        }}
        initialTopMostItemIndex={groupedData.flattened.length > 0 ? groupedData.flattened.length - 1 : 0}
        atBottomStateChange={(atBottom) => {
          isAtBottomRef.current = atBottom;
          setShowScrollBottom(!atBottom);
          // If user scrolled back to bottom and there are pending scrolls, execute them
          if (atBottom && pendingScrollRef.current) {
            pendingScrollRef.current = false;
            scrollToBottom('auto');
          }
        }}
        startReached={() => {
          if (hasMore && !isLoadingMore && !searchQuery) {
            const nextPage = page + 1;
            setPage(nextPage);
            fetchMessages(nextPage, true);
          }
        }}
        className="h-full"
        style={{ height: '100%' }}
        components={{
          Header: () => isLoadingMore ? (
            <div className="flex justify-center p-4">
              <div className="w-6 h-6 border-2 border-[var(--border)] border-t-primary-500 rounded-full"></div>
            </div>
          ) : null
        }}
      />
      {showScrollBottom && (
        <button
          onClick={() => {
            pendingScrollRef.current = false;
            scrollToBottom('smooth');
          }}
          className="absolute bottom-6 right-4 p-2.5 bg-surface border border-[var(--border)]/50 text-app-primary rounded-full shadow-lg hover:brightness-95 z-30"
        >
          <ChevronDownIcon className="w-5 h-5 stroke-[3px]" />
        </button>
      )}
    </div>
  );
}
