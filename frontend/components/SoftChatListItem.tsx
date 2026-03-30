import React from 'react';
import { formatRelativeTime, getFullFileUrl, getInitials, getAvatarColor } from '../utils/helpers';

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
}

const SoftChatListItem: React.FC<SoftChatListItemProps> = ({ 
  conversation, 
  currentUser, 
  isActive, 
  onClick 
}) => {
  const otherParticipant = conversation.participants?.find(p => p.userId !== currentUser?.id)?.user;
  const name = conversation.name || otherParticipant?.name || 'Chat';
  const avatar = otherParticipant?.avatar;
  const isOnline = otherParticipant?.isOnline;
  
  const lastMsg = conversation.lastMessage;
  const time = conversation.lastMessageAt ? formatRelativeTime(conversation.lastMessageAt) : '';

  return (
    <div 
      onClick={() => onClick(conversation.id)}
      className={`flex items-center p-4 cursor-pointer transition-colors duration-200 border-l-4 ${
        isActive 
          ? 'bg-indigo-50/50 border-soft-primary' 
          : 'bg-white border-transparent hover:bg-slate-50'
      }`}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${getAvatarColor(name)} flex items-center justify-center text-white text-lg font-bold shadow-soft overflow-hidden`}>
          {(() => {
            const url = getFullFileUrl(avatar);
            return url ? (
              <img src={url} className="w-full h-full object-cover" alt="" />
            ) : (
              getInitials(name)
            );
          })()}
        </div>
        {isOnline && (
          <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"></span>
        )}
      </div>

      {/* Content */}
      <div className="ml-4 flex-1 min-w-0">
        <div className="flex justify-between items-baseline mb-0.5">
          <h3 className="text-[15px] font-bold text-soft-text-primary truncate">
            {name}
          </h3>
          <span className="text-[11px] text-soft-text-secondary font-medium">
            {time}
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <p className="text-[13px] text-soft-text-secondary truncate max-w-[85%]">
            {lastMsg?.content || 'No messages yet'}
          </p>
          {(conversation.unreadCount ?? 0) > 0 && (
            <span className="bg-soft-gradient text-white text-[10px] font-black h-5 min-w-[20px] px-1.5 rounded-full flex items-center justify-center shadow-lg shadow-indigo-500/20">
              {conversation.unreadCount}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default React.memo(SoftChatListItem);
