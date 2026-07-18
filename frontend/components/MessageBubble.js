import React, { useEffect, useState, useRef } from 'react';
import {
  CheckIcon,
  CheckBadgeIcon,
  ArrowPathIcon,
  VideoCameraIcon,
  CalendarDaysIcon,
  DocumentDuplicateIcon,
  PencilIcon,
  TrashIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import { formatMessageTime, getInitials, getFullFileUrl } from '../utils/helpers';
import { AttachmentBubble, VoiceBubble } from './ChatMedia';
import Markdown from 'markdown-to-jsx';
import DOMPurify from 'isomorphic-dompurify';

/**
 * Memoized chat message bubble — handles rendering, touch gestures, context menu, and inline editing.
 */
const MessageBubble = React.memo(({
  message,
  isMine,
  showSender,
  currentUser,
  isActiveMenu,
  setActiveMenuId,
  isEditing,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  addReaction,
  deleteMessage,
  handleJoinCall,
  onReply,
  onLoad,
  showTail = true
}) => {
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);
  const swipeDelta = useRef(0);
  const bubbleRef = useRef(null);

  const timestamp = formatMessageTime(message.createdAt);
  const isTemp = message.id?.toString().startsWith('temp');
  const isNana = message.sender?.role?.toUpperCase() === 'NANA';

  const [localEditContent, setLocalEditContent] = useState(message.content);
  const [hasImgError, setHasImgError] = useState(false);

  useEffect(() => {
    setLocalEditContent(message.content);
  }, [message.content]);

  useEffect(() => {
    setHasImgError(false);
  }, [message.sender?.avatar]);

  const bubbleClasses = `chat-bubble ${isMine ? 'chat-bubble-me' : 'chat-bubble-other'} touch-pan-y ${showTail ? (isMine ? 'rounded-tr-none' : 'rounded-tl-none') : ''}`;

  const inlineStyles = {
    wordBreak: "break-word"
  };

  return (
    <div
      className={`flex w-full mb-3 px-3 ${isMine ? 'justify-end' : 'justify-start'} `}
    >
      <div className={`flex w-full items-end space-x-2 ${isMine ? 'flex-row-reverse space-x-reverse' : 'flex-row'}`}>
        {/* Avatar */}
        <div className="relative group shrink-0">
            <div className={`w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center text-[10px] font-black overflow-hidden ${showSender ? 'opacity-100' : 'opacity-0'} ${message.sender?.role?.toUpperCase() === 'NANA' ? 'bg-gradient-to-tr from-primary-500 to-indigo-600 text-white' : 'bg-surface-3 text-slate-600'}`}>
              {(() => {
                const avatar = message.sender?.avatar;
                const fullUrl = getFullFileUrl(avatar);
                return (fullUrl && !hasImgError) ? (
                  <img
                    src={fullUrl}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover"
                    alt=""
                    onError={() => setHasImgError(true)}
                  />
                ) : (
                  getInitials(message.sender?.name)
                );
              })()}
            </div>
          </div>

        <div className={`flex flex-col min-w-0 ${isMine ? 'items-end' : 'items-start'}`}>
          {showSender && !isMine && (
            <div className={`flex items-center space-x-1.5 mb-1 ml-1 uppercase`}>
              <span className="text-[10px] font-black text-app-secondary/80 flex items-center gap-1">
                {isNana && <SparklesIcon className="w-3 h-3 text-indigo-500" />}
                <span className={isNana ? 'text-indigo-600' : ''}>{message.sender?.name}</span>
              </span>
              {message.sender?.role?.toUpperCase() === 'LECTURER' && (
                <span className="text-[8px] font-black px-1.5 py-0.5 bg-rose-50 text-rose-600 rounded-md border border-rose-100 flex items-center">
                  <CheckBadgeIcon className="w-2.5 h-2.5 mr-0.5" />
                  LECTURER
                </span>
              )}
              {message.sender?.role?.toUpperCase() === 'COURSE_REP' && (
                <span className="text-[8px] font-black px-1.5 py-0.5 bg-primary-50 text-primary-600 rounded-md border border-primary-100 flex items-center">
                   <div className="w-1.5 h-1.5 bg-primary-400 rounded-full mr-1" />
                   COURSE REP
                </span>
              )}
            </div>
          )}

          <div
            ref={bubbleRef}
            onMouseDown={(e) => {
              const timer = setTimeout(() => {
                if (!message.isDeleted && !isEditing) setActiveMenuId(message.id);
                if (navigator.vibrate) navigator.vibrate(50);
              }, 500);
              e.currentTarget.dataset.timer = timer;
            }}
            onMouseUp={(e) => clearTimeout(e.currentTarget.dataset.timer)}
            onMouseLeave={(e) => clearTimeout(e.currentTarget.dataset.timer)}
            onTouchStart={(e) => {
              touchStartX.current = e.touches[0].clientX;
              touchStartY.current = e.touches[0].clientY;
              swipeDelta.current = 0;
              if (bubbleRef.current) bubbleRef.current.style.transition = 'none';

              const timer = setTimeout(() => {
                if (!message.isDeleted && !isEditing) setActiveMenuId(message.id);
                if (navigator.vibrate) navigator.vibrate(50);
              }, 500);
              e.currentTarget.dataset.timer = timer;
            }}
            onTouchMove={(e) => {
              if (touchStartX.current === null) return;
              const currentX = e.touches[0].clientX;
              const currentY = e.touches[0].clientY;
              const diffX = currentX - touchStartX.current;
              const diffY = currentY - touchStartY.current;

              if (Math.abs(diffY) > Math.abs(diffX)) {
                clearTimeout(e.currentTarget.dataset.timer);
                return;
              }

              if (diffX > 5) {
                clearTimeout(e.currentTarget.dataset.timer);
                const translateX = Math.min(diffX, 60);
                swipeDelta.current = translateX;
                if (bubbleRef.current) {
                  bubbleRef.current.style.transform = `translateX(${translateX}px)`;
                }
              }
            }}
            onTouchEnd={(e) => {
              clearTimeout(e.currentTarget.dataset.timer);

              if (swipeDelta.current > 40 && onReply && !message.isDeleted) {
                if (navigator.vibrate) navigator.vibrate(50);
                onReply(message);
              }

              if (bubbleRef.current) {
                bubbleRef.current.style.transition = 'transform 0.2s ease-out';
                bubbleRef.current.style.transform = 'translateX(0px)';
              }

              touchStartX.current = null;
              touchStartY.current = null;
              swipeDelta.current = 0;
            }}
            id={`message-${message.id || message.tempId}`}
            className={bubbleClasses}
            style={inlineStyles}
          >
            {message.replyTo && !message.isDeleted && (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  const targetMsg = document.getElementById(`message-${message.replyTo.id}`);
                  if (targetMsg) {
                    targetMsg.scrollIntoView({ behavior: 'auto', block: 'center' });
                    targetMsg.classList.add('ring-2', 'ring-primary-500', 'drop-shadow-lg');
                    setTimeout(() => targetMsg.classList.remove('ring-2', 'ring-primary-500', 'drop-shadow-lg'), 1500);
                  }
                }}
                className={`mb-2 p-2 rounded-lg border-l-4 text-[10px] cursor-pointer hover:opacity-80  ${isMine ? 'bg-black/10 border-white/40' : 'bg-surface-2 border-primary-500'}`}
              >
                <p className="font-black uppercase tracking-tight opacity-60">
                   Replying to {message.replyTo.sender?.name || 'User'}
                </p>
                <p className="truncate opacity-80">{message.replyTo.content || 'Attachment'}</p>
              </div>
            )}

            {isEditing ? (
              <div className="min-w-[180px]">
                <textarea
                  autoFocus
                  value={localEditContent}
                  onChange={e => setLocalEditContent(e.target.value)}
                  className="w-full bg-transparent border-none p-0 text-sm focus:ring-0 resize-none"
                />
                <div className="flex justify-end space-x-2 mt-2">
                  <button onClick={onCancelEdit} className="text-[10px] font-bold opacity-60">Cancel</button>
                  <button onClick={() => onSaveEdit(message.id, localEditContent)} className="text-[10px] font-bold text-emerald-400">Save</button>
                </div>
              </div>
            ) : message.isDeleted ? (
              <span className="text-xs italic opacity-50">This message was deleted</span>
            ) : (
              <div className="space-y-2">
                {(message.type === 'IMAGE' || message.type === 'FILE') && message.fileUrl && (
                  <AttachmentBubble message={message} onLoad={onLoad} />
                )}
                {message.type === 'VOICE' && message.fileUrl && (
                  <VoiceBubble message={message} />
                )}
                {message.attachments?.map((a, i) => (
                  <AttachmentBubble key={i} message={{ ...message, fileUrl: a.url, fileName: a.name }} onLoad={onLoad} />
                ))}
                {message.content && (
                  <>
                    {message.content.includes('Join here: https://') ? (
                      <div className="min-w-[160px] max-w-full bg-surface/10 backdrop-blur-md rounded-xl p-4 border border-white/20 shadow-inner">
                        <div className="flex items-center space-x-3 mb-3">
                          <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                            <VideoCameraIcon className="w-6 h-6 text-emerald-400" />
                          </div>
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Video Call</p>
                            <p className="text-xs font-bold text-white">Call invitation sent</p>
                          </div>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); const url = message.content.split('Join here: ')[1]; window.open(url, '_blank'); }}
                          className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-black shadow-md flex items-center justify-center space-x-2"
                        >
                          <span>Join Call</span>
                          <ArrowPathIcon className="w-3 h-3" />
                        </button>
                      </div>
                    ) : message.content.includes('🗓️ Scheduled a call') ? (
                      <div className="min-w-[160px] max-w-full bg-surface/10 backdrop-blur-md rounded-xl p-4 border border-white/20 shadow-inner">
                        <div className="flex items-center space-x-3 mb-3">
                          <div className="w-10 h-10 rounded-full bg-primary-500/20 flex items-center justify-center">
                            <CalendarDaysIcon className="w-6 h-6 text-primary-300" />
                          </div>
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-primary-300">Appointment</p>
                            <p className="text-xs font-bold text-white">Call Scheduled</p>
                          </div>
                        </div>
                        <p className="text-[11px] text-white/80 font-medium mb-3">{message.content.replace('🗓️ Scheduled a call for ', '')}</p>
                        <button className="w-full py-2 bg-surface/10 hover:bg-surface/20 text-white rounded-lg text-xs font-black border border-white/10">Add to Calendar</button>
                      </div>
                    ) : isNana ? (
                      <div className="markdown-body w-full">
                        <Markdown
                          options={{
                            overrides: {
                              h2: { component: ({children}) => <h2 className="text-xl font-black text-primary-700 mb-3 mt-1 leading-tight">{children}</h2> },
                              h3: { component: ({children}) => <h3 className="text-lg font-black text-app-primary mb-2 mt-2">{children}</h3> },
                              p: { component: ({children}) => <p className="mb-4 last:mb-0 leading-relaxed text-slate-700">{children}</p> },
                              ul: { component: ({children}) => <ul className="list-disc ml-5 space-y-2 mb-4 mt-2">{children}</ul> },
                              ol: { component: ({children}) => <ol className="list-decimal ml-5 space-y-2 mb-4 mt-2">{children}</ol> },
                              li: { component: ({children}) => <li className="text-[15px] font-medium leading-relaxed text-slate-600">{children}</li> },
                              strong: { component: ({children}) => <strong className="font-extrabold text-primary-800 bg-primary-50 px-1 rounded">{children}</strong> }
                            }
                          }}
                        >
                          {DOMPurify.sanitize(message.content)}
                        </Markdown>
                      </div>
                    ) : (
                      <p className={`font-medium leading-relaxed whitespace-pre-wrap break-words text-[15px]`}>{message.content}</p>
                    )}
                  </>
                )}
              </div>
            )}

            <div className={`flex items-center mt-1.5 space-x-1.5 justify-end whitespace-nowrap ${isMine ? 'text-white/80' : 'text-slate-400'}`}>
              <span className="text-[10px] font-semibold whitespace-nowrap">{timestamp}</span>
              {isMine && (
                isTemp ? (
                  <ArrowPathIcon className="w-2.5 h-2.5" />
                ) : (
                    message.readReceipts?.length > 0 ? (
                      <div className="flex -space-x-1.5">
                        <div className="">
                          <CheckIcon className="w-3 h-3 stroke-[3px] text-sky-400 drop-shadow-sm" />
                        </div>
                        <div className="">
                          <CheckIcon className="w-3 h-3 stroke-[3px] text-sky-400 drop-shadow-sm" />
                        </div>
                      </div>
                    ) : (
                      <div className="flex -space-x-1.5">
                        <CheckIcon className="w-3 h-3 stroke-[3px] text-white/50" />
                        <CheckIcon className="w-3 h-3 stroke-[3px] text-white/50" />
                      </div>
                    )
                )
              )}
            </div>

            {isActiveMenu && (
              <>
                <div
                  className="fixed inset-0 z-[1999]"
                  onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); }}
                  onTouchStart={(e) => { e.stopPropagation(); setActiveMenuId(null); }}
                />
                <div
                  className={`absolute z-[2000] bottom-full mb-2 bg-surface rounded-xl shadow-2xl border border-[var(--border)]/50 min-w-[140px] overflow-hidden ${isMine ? 'right-0' : 'left-0'} backdrop-blur-md`}
                  onClick={e => e.stopPropagation()}
                >
                  <div className="flex justify-around p-2 bg-surface-2 border-b border-[var(--border)]/50">
                    {['❤️', '👍', '🔥', '😂'].map(e => (
                      <button key={e} onClick={() => { addReaction(message.id, e); setActiveMenuId(null); }} className="">
                        {e}
                      </button>
                    ))}
                  </div>
                  <div className="p-1 flex flex-col">
                    <button onClick={() => { navigator.clipboard.writeText(message.content); setActiveMenuId(null); }} className="flex items-center space-x-2 px-3 py-2 text-[10px] font-black text-app-secondary hover:bg-surface-2 rounded-lg">
                      <DocumentDuplicateIcon className="w-3.5 h-3.5" /> <span>Copy text</span>
                    </button>
                    {isMine && !message.isDeleted && (
                      <>
                        <button onClick={() => { onStartEdit(message.id); setLocalEditContent(message.content); setActiveMenuId(null); }} className="flex items-center space-x-2 px-3 py-2 text-[10px] font-black text-app-secondary hover:bg-surface-2 rounded-lg">
                          <PencilIcon className="w-3.5 h-3.5" /> <span>Edit</span>
                        </button>
                        <button onClick={() => { deleteMessage(message.id); setActiveMenuId(null); }} className="flex items-center space-x-2 px-3 py-2 text-[10px] font-black text-red-500 hover:bg-red-50 rounded-lg">
                          <TrashIcon className="w-3.5 h-3.5" /> <span>Delete message</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

export default MessageBubble;
