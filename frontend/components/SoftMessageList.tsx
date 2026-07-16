import React, { useRef, useEffect } from 'react';
import { Virtuoso } from 'react-virtuoso';
import { formatRelativeTime } from '../utils/helpers';

interface Message {
  id: string;
  senderId: string;
  content: string;
  type: 'TEXT' | 'IMAGE' | 'FILE' | 'VOICE';
  createdAt: string;
  sender: {
    id: string;
    name: string;
    avatar?: string;
  };
}

interface SoftMessageListProps {
  messages: Message[];
  currentUser: { id: string } | null;
}

const SoftMessageList: React.FC<SoftMessageListProps> = ({ messages, currentUser }) => {
  const virtuosoRef = useRef<any>(null);

  useEffect(() => {
    if (virtuosoRef.current && messages.length > 0) {
      virtuosoRef.current.scrollToIndex({ index: messages.length - 1, align: 'end' });
    }
  }, [messages.length]);

  const renderItem = (index: number) => {
    const msg = messages[index];
    if (!msg) return null;
    const isMe = msg.senderId === currentUser?.id;

    return (
      <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} px-6 py-2`}>
        <div className={`flex flex-col max-w-[80%] ${isMe ? 'items-end' : 'items-start'}`}>
          <div className={`p-4 rounded-[30px] text-[15px] font-bold tracking-tight ${
            isMe
              ? 'chat-bubble-me rounded-tr-[10px]'
              : 'chat-bubble-other rounded-tl-[10px]'
          }`}>
            {msg.type === 'VOICE' ? (
              <div className="flex items-center space-x-3 py-1 min-w-[140px]">
                <div className="w-9 h-9 rounded-full bg-surface/20 flex items-center justify-center">
                  <div className="w-3.5 h-3.5 bg-surface rounded-full"></div>
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex justify-between items-center px-1">
                    <div className="h-1.5 w-1.5 rounded-full bg-surface" />
                    <div className="h-1.5 w-1.5 rounded-full bg-surface" />
                    <div className="h-1.5 w-1.5 rounded-full bg-surface" />
                  </div>
                  <div className="h-1 bg-surface/30 rounded-full overflow-hidden">
                    <div className="w-[60%] h-full bg-surface"></div>
                  </div>
                </div>
              </div>
            ) : (
              msg.content
            )}
          </div>
          <span className="text-[10px] font-black text-[#8B90A0] mt-1.5 uppercase tracking-widest px-2">
            {formatRelativeTime(msg.createdAt)}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 min-h-0 bg-[#f5f7fb]" role="log" aria-live="polite">
      <Virtuoso
        ref={virtuosoRef}
        totalCount={messages.length}
        itemContent={renderItem}
        followOutput="smooth"
        initialTopMostItemIndex={messages.length > 0 ? messages.length - 1 : 0}
        style={{ height: '100%' }}
      />
    </div>
  );
};

export default React.memo(SoftMessageList) as any;
