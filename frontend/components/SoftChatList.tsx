import React, { useCallback } from 'react';
import SoftChatListItem from './SoftChatListItem';

interface ChatListProps {
  conversations: any[];
  currentUser: any;
  onChatClick: (id: string) => void;
  loading: boolean;
  onStartChat?: () => void;
}

const SoftChatList: React.FC<ChatListProps> = ({ conversations, currentUser, onChatClick, loading, onStartChat }) => {
  if (loading) {
    return (
      <div className="px-2 py-4 space-y-5">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="flex px-4 space-x-4 animate-pulse items-center">
            <div className="w-[52px] h-[52px] bg-slate-200 rounded-full shrink-0"></div>
            <div className="flex-1 space-y-2.5">
              <div className="h-3.5 bg-slate-200 rounded-full w-1/3"></div>
              <div className="h-3 bg-slate-200 rounded-full w-2/3"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-20 text-center mt-4">
        <div className="w-24 h-24 mb-6">
           <svg fill="currentColor" viewBox="0 0 24 24" className="w-full h-full text-slate-200">
              <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12c0 1.846.5 3.58 1.383 5.093L2 22l4.907-1.383A9.957 9.957 0 0012 22z" />
           </svg>
        </div>
        <h3 className="text-xl font-bold text-slate-800 mb-2">No chats yet</h3>
        <p className="text-[15px] font-medium text-slate-500 mb-8 max-w-[220px]">
          Start a conversation to begin connecting with friends.
        </p>
        <button 
          onClick={onStartChat}
          className="bg-primary-500 text-white font-bold py-3.5 px-8 rounded-full shadow-lg shadow-primary-500/30 active:scale-95 transition-transform"
        >
          Start Chat
        </button>
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
