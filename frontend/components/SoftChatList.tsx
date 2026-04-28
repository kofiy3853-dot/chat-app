import React, { useState, useEffect } from 'react';
import { Virtuoso } from 'react-virtuoso';
import SoftChatListItem from './SoftChatListItem';
import { TrashIcon } from '@heroicons/react/24/solid';
import EmptyState from './EmptyState';

interface ChatListProps {
  conversations: any[];
  currentUser: any;
  onChatClick: (id: string) => void;
  loading: boolean;
  onStartChat?: () => void;
  typingInConvs?: { [key: string]: { [userId: string]: string } };
  onDelete?: (id: string, e?: React.MouseEvent) => void;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
}

const SoftChatList: React.FC<ChatListProps> = ({ conversations, currentUser, onChatClick, loading, onStartChat, typingInConvs, onDelete, selectedIds, onToggleSelect }) => {
  const [longPressedId, setLongPressedId] = useState<string | null>(null);
  const [scrollParent, setScrollParent] = useState<HTMLElement | null>(null);

  useEffect(() => {
    // Find the main scroll container from index.tsx layout
    const parent = document.querySelector('main');
    if (parent) setScrollParent(parent as HTMLElement);
  }, []);

  if (loading) {
    return (
      <div className="px-2 py-4 space-y-5">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="flex px-4 space-x-4 items-center">
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
      <EmptyState 
        title="No chats yet"
        description="Start a conversation to begin connecting with friends and colleagues across campus."
        actionText="Start Chat"
        onAction={onStartChat}
        icon="💬"
      />
    );
  }

  return (
    <div className="w-full relative min-h-screen">
      {scrollParent && (
        <Virtuoso
          customScrollParent={scrollParent}
          data={conversations}
          className="divide-y divide-slate-50 pb-[100px]"
          itemContent={(index, conv) => (
            <div className="relative select-none">
              <SoftChatListItem 
                conversation={conv} 
                currentUser={currentUser} 
                onClick={onChatClick}
                typingUsers={typingInConvs?.[conv.id]}
                onLongPress={() => setLongPressedId(conv.id)}
                isSelected={selectedIds?.has(conv.id)}
              />
              {longPressedId === conv.id && (
                <>
                  <div 
                    className="fixed inset-0 z-[100] bg-black/5" 
                    onClick={(e) => { e.stopPropagation(); setLongPressedId(null); }}
                  />
                  <div className="absolute top-1/2 left-1/2 -/2 -/2 z-[101] flex flex-col items-center">
                    <button 
                      onClick={(e) => { onDelete?.(conv.id, e); setLongPressedId(null); }}
                      className="bg-red-500 text-white px-6 py-3 rounded-2xl shadow-xl shadow-red-500/20 flex items-center space-x-2 active:"
                    >
                      <TrashIcon className="w-5 h-5 text-white" />
                      <span className="text-sm font-bold tracking-wide">Delete Chat</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        />
      )}
    </div>
  );
};

export default React.memo(SoftChatList);
