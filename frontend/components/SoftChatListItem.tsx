import React, { useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import { formatShortTime, getFullFileUrl, getInitials, getAvatarColor } from '../utils/helpers';

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
}

interface Conversation {
  id: string;
  name?: string;
  type: 'DIRECT' | 'GROUP';
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

  const startPress = useCallback(() => {
    pressTimer.current = setTimeout(() => {
      if (navigator.vibrate) navigator.vibrate(50);
      onLongPress?.();
    }, 600);
  }, [onLongPress]);

  const endPress = useCallback(() => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
  }, []);

  const otherParticipant = conversation.participants?.find(p => p.userId !== currentUser?.id)?.user;
  const name = conversation.name || otherParticipant?.name || 'Chat';
  const avatar = otherParticipant?.avatar;
  const isOnline = otherParticipant?.isOnline;
  const unread = conversation.unreadCount ?? 0;
  const isGroup = conversation.type === 'GROUP';

  const lastMsg = conversation.lastMessage;
  const time = conversation.lastMessageAt ? formatShortTime(conversation.lastMessageAt) : '';
  
  let preview = getLastMsgPreview(lastMsg);
  const isSomeoneTyping = typingUsers && Object.keys(typingUsers).length > 0;
  if (isSomeoneTyping) {
    const typerNames = Object.values(typingUsers);
    preview = typerNames.length === 1 ? `${typerNames[0]} is typing…` : `${typerNames.length} people are typing…`;
  }

  const avatarUrl = getFullFileUrl(avatar);

  return (
    <div
      onClick={() => onClick(conversation.id)}
      onMouseDown={startPress}
      onMouseUp={endPress}
      onMouseLeave={endPress}
      onTouchStart={startPress}
      onTouchEnd={endPress}
      className={`flex items-center px-4 py-3.5 cursor-pointer transition-colors duration-150 relative select-none border-b border-app-light last:border-0 ${
        isSelected ? 'bg-primary-50' : 'hover:bg-surface-2 active:bg-surface-2'
      }`}
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
           if (otherParticipant?.role === 'NANA') {
             e.stopPropagation();
             router.push('/nana');
           }
        }}
      >
        <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center">
          {avatarUrl && otherParticipant?.role !== 'NANA' ? (
            <img
              src={avatarUrl}
              className="w-full h-full object-cover"
              alt={name}
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          ) : (
            <div className={`w-full h-full flex items-center justify-center ${otherParticipant?.role === 'NANA' ? 'bg-gradient-to-tr from-primary-500 to-indigo-600 text-white font-black text-lg' : `bg-gradient-to-br ${getAvatarColor(name)} text-white font-bold`}`}>
              <span className={otherParticipant?.role === 'NANA' ? '' : 'text-sm'}>
                {otherParticipant?.role === 'NANA' ? 'N' : getInitials(name)}
              </span>
            </div>
          )}
        </div>

        {/* Online dot */}
        {isOnline && !isGroup && (
          <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 border-2 border-white rounded-full" />
        )}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <h3 className={`text-[15px] truncate pr-2 ${unread > 0 ? 'font-bold text-app-primary' : 'font-semibold text-app-primary'}`}>
            {name}
          </h3>
          <span className={`text-[11px] flex-shrink-0 ${unread > 0 ? 'text-primary-500 font-semibold' : 'text-gray-400 font-normal'}`}>
            {time}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <p className={`text-[13px] truncate pr-2 leading-snug ${
            isSomeoneTyping
              ? 'text-primary-500 font-semibold italic'
              : unread > 0
              ? 'text-gray-700 font-medium'
              : 'text-gray-400 font-normal'
          }`}>
            {preview}
          </p>

          {unread > 0 && (
            <span className="flex-shrink-0 min-w-[20px] h-5 px-1.5 rounded-full flex items-center justify-center text-[11px] font-bold text-white bg-primary-500">
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default React.memo(SoftChatListItem);
