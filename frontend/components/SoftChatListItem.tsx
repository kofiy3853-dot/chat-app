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
      className="flex items-center px-6 py-4 cursor-pointer transition-all duration-300 hover:bg-slate-50 relative group"
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0 mr-4">
        <div className="w-[52px] h-[52px] rounded-full overflow-hidden shadow-sm border border-gray-100">
          {avatarUrl ? (
            <img src={avatarUrl} className="w-full h-full object-cover" alt="" />
          ) : (
            <div className={`w-full h-full bg-gradient-to-tr ${getAvatarColor(name)} flex items-center justify-center text-white`}>
              <span className="text-base font-bold tracking-tight">{getInitials(name)}</span>
            </div>
          )}
        </div>
        {isOnline && (
          <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full" />
        )}
      </div>

      {/* Text content */}
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center mb-0.5">
          <h3 className="text-[16px] font-black text-[#1A1D3A] truncate tracking-tight pr-2">
            {name}
          </h3>
          <span className="text-[11px] font-bold text-[#8B90A0] uppercase tracking-tighter">
            {time}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <p className={`text-[13px] truncate tracking-tight ${unread > 0 ? 'font-black text-primary-600' : 'text-[#8B90A0] font-medium'}`}>
            {preview}
          </p>
          {unread > 0 && (
            <span className="ml-2 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-white bg-primary-500 shadow-md shadow-primary-500/30">
              {unread}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default React.memo(SoftChatListItem);
