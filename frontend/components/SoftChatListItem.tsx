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
  onClick
}) => {
  const otherParticipant = conversation.participants?.find(p => p.userId !== currentUser?.id)?.user;
  const name = conversation.name || otherParticipant?.name || 'Chat';
  const avatar = otherParticipant?.avatar;
  const isOnline = otherParticipant?.isOnline;
  const unread = conversation.unreadCount ?? 0;

  const lastMsg = conversation.lastMessage;
  const time = conversation.lastMessageAt ? formatRelativeTime(conversation.lastMessageAt) : '';
  const preview = getLastMsgPreview(lastMsg);

  const avatarUrl = getFullFileUrl(avatar);

  return (
    <div
      onClick={() => onClick(conversation.id)}
      className={`flex items-center px-5 py-3.5 cursor-pointer transition-all duration-200 ${
        isActive ? 'bg-primary-50' : 'hover:bg-slate-50/80'
      }`}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0 mr-4">
        <div className="w-14 h-14 rounded-full overflow-hidden flex items-center justify-center text-white text-lg font-bold">
          {avatarUrl ? (
            <img src={avatarUrl} className="w-full h-full object-cover" alt="" />
          ) : (
            <div className={`w-full h-full rounded-full bg-gradient-to-tr ${getAvatarColor(name)} flex items-center justify-center`}>
              <span className="text-base font-bold">{getInitials(name)}</span>
            </div>
          )}
        </div>
        {/* Online indicator */}
        {isOnline && (
          <span className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 bg-green-400 border-2 border-white rounded-full shadow-sm" />
        )}
      </div>

      {/* Text content */}
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-baseline mb-0.5">
          <h3 className={`text-[15px] truncate pr-2 ${unread > 0 ? 'font-black text-soft-text-primary' : 'font-semibold text-slate-700'}`}>
            {name}
          </h3>
          <span className="text-[11px] text-soft-text-secondary font-medium whitespace-nowrap flex-shrink-0">
            {time}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <p className={`text-[13px] truncate ${unread > 0 ? 'font-semibold text-slate-600' : 'text-soft-text-secondary font-normal'}`}>
            {preview}
          </p>
          {unread > 0 && (
            <span className="ml-2 flex-shrink-0 min-w-[20px] h-5 px-1.5 rounded-full flex items-center justify-center text-[10px] font-black text-white badge-gradient">
              {unread}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default React.memo(SoftChatListItem);
