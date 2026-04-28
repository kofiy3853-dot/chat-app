import React, { useRef, useCallback, useState } from 'react';
import { useRouter } from 'next/router';
import { formatShortTime, getFullFileUrl, getInitials, getAvatarColor } from '../utils/helpers';
import { CheckIcon } from '@heroicons/react/24/outline';

interface User {
  id: string;
  name: string;
  avatar?: string;
  isOnline?: boolean;
  role?: string;
}

interface Participant {
  userId: string;
  user: User;
}

interface Message {
  content: string;
  createdAt: string;
  senderId: string;
  type?: string;
  readReceipts?: any[];
}

interface Conversation {
  id: string;
  name?: string;
  type: 'DIRECT' | 'GROUP' | 'COURSE' | 'ai';
  participants: Participant[];
  lastMessage?: Message;
  lastMessageAt?: string;
  unreadCount?: number;
}

interface SoftChatListItemProps {
  conversation: Conversation;
  currentUser: { id: string } | null;
  isActive?: boolean;
  onClick: (id: string) => void;
  typingUsers?: { [userId: string]: string };
  onLongPress?: () => void;
  isSelected?: boolean;
}

const getLastMsgPreview = (msg?: Message) => {
  if (!msg) return 'No messages yet';
  if (msg.type === 'VOICE') return '🎙️ Voice message';
  if (msg.type === 'IMAGE') return '📷 Image';
  if (msg.type === 'FILE') return '📎 File';
  return msg.content || 'No messages yet';
};

const SoftChatListItem: React.FC<SoftChatListItemProps> = ({
  conversation,
  currentUser,
  isActive,
  onClick,
  typingUsers,
  onLongPress,
  isSelected
}) => {
  const router = useRouter();
  const pressTimer = useRef<NodeJS.Timeout | null>(null);
  // Per-item image error state — ensures graceful fallback to initials
  const [imgError, setImgError] = useState(false);

  const startPress = useCallback(() => {
    pressTimer.current = setTimeout(() => {
      if (navigator.vibrate) navigator.vibrate(50);
      onLongPress?.();
    }, 600);
  }, [onLongPress]);

  const endPress = useCallback(() => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
  }, []);

  const otherParticipant = (conversation.participants || []).find(p => p.userId !== currentUser?.id)?.user;
  const name = conversation.name || otherParticipant?.name || 'Chat';
  const avatar = otherParticipant?.avatar;
  const isOnline = otherParticipant?.isOnline;
  const unread = conversation.unreadCount ?? 0;
  const isGroup = conversation.type === 'GROUP';
  const isNana = otherParticipant?.role === 'NANA';

  const lastMsg = conversation.lastMessage;
  const time = conversation.lastMessageAt ? formatShortTime(conversation.lastMessageAt) : '';

  let preview = getLastMsgPreview(lastMsg);
  const isSomeoneTyping = typingUsers && Object.keys(typingUsers).length > 0;
  if (isSomeoneTyping) {
    const typerNames = Object.values(typingUsers);
    preview = typerNames.length === 1 ? `${typerNames[0]} is typing…` : `${typerNames.length} people are typing…`;
  }

  const avatarUrl = getFullFileUrl(avatar);
  // Only show image if URL resolves, no error occurred, and it's not the Nana bot
  const showImage = !!avatarUrl && !imgError && !isNana;

  const isCourse = conversation.type === 'COURSE';
  const isAi = conversation.type === 'ai';

  const rowStyles = isSelected ? 'bg-primary-50' :
    isAi ? 'bg-indigo-50/40 hover:bg-indigo-50/80 active:bg-indigo-100/80' :
    isCourse ? 'hover:bg-amber-50/40 active:bg-amber-50/60' :
    isGroup ? 'hover:bg-emerald-50/40 active:bg-emerald-50/60' :
    'hover:bg-surface-2 active:bg-surface-2';

  return (
    <div
      onClick={() => onClick(conversation.id)}
      onMouseDown={startPress}
      onMouseUp={endPress}
      onMouseLeave={endPress}
      onTouchStart={startPress}
      onTouchEnd={endPress}
      className={`flex items-center px-4 py-2.5 cursor-pointer relative select-none border-b border-app-light last:border-0 transition-colors ${rowStyles}`}
    >
      {/* Selection Checkmark */}
      {isSelected && (
        <div className="absolute left-1.5 top-1/2 -translate-y-1/2 z-10">
          <div className="w-5 h-5 rounded-full bg-primary-500 flex items-center justify-center shadow-sm">
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
      )}

      {/* Avatar */}
      <div
        className="relative flex-shrink-0 mr-3 cursor-pointer"
        onClick={(e) => {
          if (isNana) {
            e.stopPropagation();
            router.push('/nana');
          }
        }}
      >
        <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center">
          {showImage ? (
            <img
              src={avatarUrl}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover"
              alt={name}
              onError={() => setImgError(true)}
            />
          ) : (
            <div
              className={`w-full h-full flex items-center justify-center ${
                isNana
                  ? 'bg-gradient-to-tr from-primary-500 to-indigo-600 text-white font-black text-lg'
                  : `bg-gradient-to-br ${getAvatarColor(name)} text-white font-bold`
              }`}
            >
              <span className={isNana ? '' : 'text-sm'}>
                {isNana ? 'N' : getInitials(name)}
              </span>
            </div>
          )}
        </div>

        {/* Online dot */}
        {isOnline && !isGroup && (
          <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 border-2 border-white rounded-full" />
        )}
      </div>

      {/* Text Configuration */}
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        {/* Top Row: Name and Time */}
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <h3
            className={`text-[15px] truncate flex items-center flex-grow ${
              unread > 0 ? 'font-bold text-app-primary' : 'font-semibold text-app-primary'
            }`}
          >
            {name}
            {isAi && (
              <span className="ml-2 px-1.5 py-0.5 rounded-md bg-indigo-100 text-indigo-700 text-[9px] font-black uppercase tracking-widest border border-indigo-200">
                AI Agent
              </span>
            )}
            {isCourse && (
               <span className="ml-2 px-1 py-0.5 rounded text-amber-600 text-[10px]" title="Course Room">🎓</span>
            )}
            {isGroup && !isCourse && (
               <span className="ml-2 px-1 py-0.5 rounded text-emerald-600 text-[10px]" title="Hub">🔥</span>
            )}
          </h3>
          <span
            className={`text-[11px] flex-shrink-0 whitespace-nowrap ${
              unread > 0 ? 'text-primary-500 font-bold' : 'text-app-muted font-medium'
            }`}
          >
            {time}
          </span>
        </div>

        {/* Bottom Row: Message Preview and Unread Badge */}
        <div className="flex items-start justify-between gap-3">
          <div
            className={`text-[13px] line-clamp-1 leading-[1.35] break-words flex-grow min-w-0 flex items-center ${
              isSomeoneTyping
                ? 'text-primary-500 font-semibold italic'
                : unread > 0
                ? 'text-app-primary font-medium'
                : 'text-app-secondary font-normal'
            }`}
          >
            {lastMsg?.senderId === currentUser?.id && unread === 0 && (
              <div className="flex -space-x-1.5 mr-1.5 flex-shrink-0">
                {(lastMsg?.readReceipts?.length ?? 0) > 0 ? (
                  <>
                    <CheckIcon className="w-3.5 h-3.5 stroke-[3.5px] text-sky-400" />
                    <CheckIcon className="w-3.5 h-3.5 stroke-[3.5px] text-sky-400" />
                  </>
                ) : (
                  <>
                    <CheckIcon className="w-3.5 h-3.5 stroke-[3.5px] text-gray-300" />
                    <CheckIcon className="w-3.5 h-3.5 stroke-[3.5px] text-gray-300" />
                  </>
                )}
              </div>
            )}
            <span className="truncate">
              {isGroup && lastMsg && lastMsg.senderId !== currentUser?.id && !isSomeoneTyping && (
                <span className="font-bold mr-1">{(lastMsg as any).sender?.name?.split(' ')[0]}:</span>
              )}
              {preview}
            </span>
          </div>

          {unread > 0 && (
            <div className="flex-shrink-0 mt-0.5">
              <span className="min-w-[20px] h-5 px-1.5 rounded-full flex items-center justify-center text-[11px] font-bold text-white shadow-sm bg-primary-500 ring-2 ring-white">
                {unread > 99 ? '99+' : unread}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default React.memo(SoftChatListItem);
