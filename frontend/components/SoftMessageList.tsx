import React, { useRef, useEffect, useCallback } from 'react';
import { List } from 'react-window';
import { formatRelativeTime, getFullFileUrl, getInitials, getAvatarColor } from '../utils/helpers';

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
  const listRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (listRef.current && messages.length > 0) {
      listRef.current.scrollToRow({ index: messages.length - 1, align: 'end' });
    }
  }, [messages.length]);

  const getRowHeight = useCallback((index: number) => {
    const msg = messages[index];
    const baseHeight = 60; // Padding + Avatar height
    const charPerLine = 35;
    const lines = Math.ceil((msg.content?.length || 0) / charPerLine);
    return baseHeight + (lines * 20); // Estimation
  }, [messages]);

  const MessageItem = useCallback(({ index, style, ariaAttributes }: { index: number; style: React.CSSProperties; ariaAttributes?: any }) => {
    const msg = messages[index];
    if (!msg) return null;
    const isMe = msg.senderId === currentUser?.id;
    
    return (
      <div 
        style={style} 
        {...ariaAttributes}
        className={`flex ${isMe ? 'justify-end' : 'justify-start'} px-4 py-2`}
      >
        <div className={`flex flex-col max-w-[80%] ${isMe ? 'items-end' : 'items-start'}`}>
          <div className={`p-4 rounded-[18px] text-[15px] font-medium shadow-soft ${
            isMe 
              ? 'bg-soft-gradient text-white rounded-br-none' 
              : 'bg-white text-soft-text-primary rounded-bl-none border border-slate-50'
            }`}
          >
            {msg.type === 'VOICE' ? (
              <div className="flex items-center space-x-2 py-1 min-w-[120px]">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  <div className="w-4 / 4 bg-white rounded-sm"></div>
                </div>
                <div className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
                  <div className="w-1/2 h-full bg-white"></div>
                </div>
              </div>
            ) : (
              msg.content
            )}
          </div>
          <span className="text-[10px] font-bold text-soft-text-secondary mt-1 uppercase tracking-widest px-1">
            {formatRelativeTime(msg.createdAt)}
          </span>
        </div>
      </div>
    );
  }, [messages, currentUser]);

  return (
    <div ref={containerRef} className="flex-1 min-h-0 bg-[#f5f7fb]">
      {containerRef.current && (
        <List
          listRef={listRef}
          rowCount={messages.length}
          rowHeight={getRowHeight}
          className="scrollbar-hide"
          rowComponent={MessageItem as any}
          rowProps={{}}
          style={{ height: containerRef.current.offsetHeight, width: '100%' }}
        />
      )}
    </div>
  );
};

export default React.memo(SoftMessageList) as any;
