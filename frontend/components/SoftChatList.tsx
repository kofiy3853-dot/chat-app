import React, { useState } from 'react';
import SoftChatListItem from './SoftChatListItem';
import { TrashIcon } from '@heroicons/react/24/solid';

interface ChatListProps {
  conversations: any[];
  currentUser: any;
  onChatClick: (id: string) => void;
  loading: boolean;
  onStartChat?: () => void;
  typingInConvs?: { [key: string]: { [userId: string]: string } };
  onDelete?: (id: string, e?: React.MouseEvent) => void;
}

const SoftChatList: React.FC<ChatListProps> = ({ conversations, currentUser, onChatClick, loading, onStartChat, typingInConvs, onDelete }) => {
  const [longPressedId, setLongPressedId] = useState<string | null>(null);

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
        <div key={conv.id} className="relative select-none">
          <SoftChatListItem 
            conversation={conv} 
            currentUser={currentUser} 
            onClick={onChatClick}
            typingUsers={typingInConvs?.[conv.id]}
            onLongPress={() => setLongPressedId(conv.id)}
          />
          {longPressedId === conv.id && (
            <>
              <div 
                className="fixed inset-0 z-[100] bg-black/5" 
                onClick={(e) => { e.stopPropagation(); setLongPressedId(null); }}
              />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[101] flex flex-col items-center">
                <button 
                  onClick={(e) => { onDelete?.(conv.id, e); setLongPressedId(null); }}
                  className="bg-red-500 text-white px-6 py-3 rounded-2xl shadow-xl shadow-red-500/20 flex items-center space-x-2 active:scale-95 transition-transform"
                >
                  <TrashIcon className="w-5 h-5 text-white" />
                  <span className="text-sm font-bold tracking-wide">Delete Chat</span>
                </button>
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
};

export default React.memo(SoftChatList);
