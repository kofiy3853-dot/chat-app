import React, { useRef, useCallback } from 'react';
import { formatShortTime, getFullFileUrl, getInitials, getAvatarColor } from '../utils/helpers';

interface User {
  id: string;
  name: string;
  avatar?: string;
  isOnline?: boolean;
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
  onLongPress
}) => {
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

  const lastMsg = conversation.lastMessage;
  const time = conversation.lastMessageAt ? formatShortTime(conversation.lastMessageAt) : '';
  
  let preview = getLastMsgPreview(lastMsg);
  const isSomeoneTyping = typingUsers && Object.keys(typingUsers).length > 0;
  if (isSomeoneTyping) {
    const typerNames = Object.values(typingUsers);
    preview = typerNames.length === 1 ? `${typerNames[0]} is typing...` : `${typerNames.length} people are typing...`;
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
      className="flex items-center px-4 py-4 cursor-pointer transition-colors duration-200 hover:bg-gray-50 relative group bg-white border-b border-gray-100 last:border-0 select-none"
    >
      {/* Avatar Container */}
      <div className="relative flex-shrink-0 mr-4">
        <div className="w-14 h-14 rounded-full overflow-hidden shadow-sm bg-gray-100 flex items-center justify-center border border-gray-100/50">
          {avatarUrl ? (
            <img 
              src={avatarUrl} 
              className="w-full h-full object-cover" 
              alt={name} 
              onError={(e) => {
                // Fallback implemented by removing image source so it defaults to next condition if possible, or just hides.
                e.currentTarget.style.display = 'none';
              }} 
            />
          ) : (
            <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br ${getAvatarColor(name)}`}>
              <span className="text-white text-lg font-bold tracking-wide">{getInitials(name)}</span>
            </div>
          )}
        </div>
        
        {/* Online Indicator */}
        {isOnline && (
          <span className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full shadow-sm" />
        )}
      </div>

      {/* Text Content */}
      <div className="flex-1 min-w-0 flex flex-col justify-center h-14">
        <div className="flex justify-between items-center mb-1">
          <h3 className="text-base font-bold text-gray-900 truncate pr-3 tracking-tight">
            {name}
          </h3>
          <span className="text-xs font-medium text-gray-400 whitespace-nowrap flex-shrink-0">
            {time}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <p className={`text-sm truncate pr-3 ${isSomeoneTyping ? 'font-black text-primary-500 animate-pulse' : unread > 0 ? 'font-bold text-gray-900' : 'text-gray-500 font-medium'}`}>
            {preview}
          </p>
          
          {unread > 0 && (
            <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white bg-primary-500 shadow-sm">
              {unread}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default React.memo(SoftChatListItem);
