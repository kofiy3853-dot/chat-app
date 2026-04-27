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
        role="article"
        aria-label={`Message from ${msg.sender.name} at ${formatRelativeTime(msg.createdAt)}: ${msg.content}`}
        className={`flex ${isMe ? 'justify-end' : 'justify-start'} px-6 py-2`}
      >
        <div className={`flex flex-col max-w-[80%] ${isMe ? 'items-end' : 'items-start'}`}>
          <div className={`p-4 rounded-[30px] text-[15px] font-bold tracking-tight ${
            isMe 
              ? 'chat-bubble-me rounded-tr-[10px]' 
              : 'chat-bubble-other rounded-tl-[10px]'
            }`}
          >
            {msg.type === 'VOICE' ? (
              <div className="flex items-center space-x-3 py-1 min-w-[140px]" aria-label="Voice message">
                <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
                  <div className="w-3.5 h-3.5 bg-white rounded-full"></div>
                </div>
                <div className="flex-1 space-y-1">
                   <div className="flex justify-between items-center px-1">
                      <div className="h-1.5 w-1.5 rounded-full bg-white animate-bounce" />
                      <div className="h-1.5 w-1.5 rounded-full bg-white animate-bounce delay-75" />
                      <div className="h-1.5 w-1.5 rounded-full bg-white animate-bounce delay-150" />
                   </div>
                   <div className="h-1 bg-white/30 rounded-full overflow-hidden">
                      <div className="w-[60%] h-full bg-white "></div>
                   </div>
                </div>
              </div>
            ) : (
              msg.content
            )}
          </div>
          <span className="text-[10px] font-black text-[#8B90A0] mt-1.5 uppercase tracking-widest px-2" aria-hidden="true">
            {formatRelativeTime(msg.createdAt)}
          </span>
        </div>
      </div>
    );
  }, [messages, currentUser]);

  return (
    <div ref={containerRef} className="flex-1 min-h-0 bg-[#f5f7fb]" role="log" aria-live="polite">
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
