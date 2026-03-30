import React, { useCallback } from 'react';
import SoftChatListItem from './SoftChatListItem';

interface ChatListProps {
  conversations: any[];
  currentUser: any;
  onChatClick: (id: string) => void;
  loading: boolean;
}

const SoftChatList: React.FC<ChatListProps> = ({ conversations, currentUser, onChatClick, loading }) => {
  if (loading) {
    return (
      <div className="p-6 space-y-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="flex space-x-4 animate-pulse">
            <div className="w-12 h-12 bg-slate-100 rounded-2xl"></div>
            <div className="flex-1 space-y-2 py-1">
              <div className="h-4 bg-slate-100 rounded w-1/3"></div>
              <div className="h-3 bg-slate-100 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 text-slate-300">
           {/* Icon logic would go here if needed */}
        </div>
        <p className="text-sm font-bold text-soft-text-secondary uppercase tracking-widest">No messages found</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-50">
      {conversations.map(conv => (
        <SoftChatListItem 
          key={conv.id} 
          conversation={conv} 
          currentUser={currentUser} 
          onClick={onChatClick}
        />
      ))}
    </div>
  );
};

export default React.memo(SoftChatList);
