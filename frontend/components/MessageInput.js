import React, { useRef, useCallback } from 'react';
import {
  PaperAirplaneIcon,
  FaceSmileIcon,
  PaperClipIcon,
  ArrowPathIcon,
  MicrophoneIcon,
  StopCircleIcon,
  XMarkIcon,
  DocumentIcon,
} from '@heroicons/react/24/outline';
import { compressImage, getFullFileUrl, getInitials } from '../utils/helpers';
import dynamic from 'next/dynamic';

const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false });

/**
 * Message input area — textarea, file upload, voice recording, emoji picker, mention picker.
 */
export default function MessageInput({
  newMessage,
  setNewMessage,
  onSendMessage,
  onInputChange,
  replyTo,
  onClearReply,
  mediaFile,
  setMediaFile,
  isRecording,
  onStartRecording,
  onStopRecording,
  isSending,
  canSend,
  showEmojiPicker,
  setShowEmojiPicker,
  showMentionPicker,
  setShowMentionPicker,
  mentionQuery,
  participants,
  currentUser,
  isInputFocused,
  setIsInputFocused,
  isNanaSession,
  quickActions,
  messages,
}) {
  const fileInputRef = useRef(null);

  const handleFileSelect = useCallback(async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.type.startsWith('image/')) {
      const compressed = await compressImage(file, 800, 800, 0.7);
      setMediaFile(compressed);
    } else {
      setMediaFile(file);
    }
  }, [setMediaFile]);

  const handlePaste = useCallback((e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) {
          compressImage(file, 800, 800, 0.7).then(compressed => {
            setMediaFile(compressed);
          });
        }
        e.preventDefault();
        break;
      }
    }
  }, [setMediaFile]);

  const handleMentionSelect = useCallback((participant) => {
    const val = newMessage;
    const el = document.activeElement;
    let cursorPosition = val.length;

    if (el && el.tagName === 'TEXTAREA') {
      cursorPosition = el.selectionStart;
    }

    const textBeforeCursor = val.slice(0, cursorPosition);
    const textAfterCursor = val.slice(cursorPosition);
    const replaced = textBeforeCursor.replace(/@[\w\s]*$/, `@${participant.user.name} `);
    setNewMessage(replaced + textAfterCursor);
    setShowMentionPicker(false);
    if (el) el.focus();
  }, [newMessage, setNewMessage, setShowMentionPicker]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSendMessage();
    }
  }, [onSendMessage]);

  const filteredParticipants = participants.filter(
    p => p.user?.id !== currentUser?.id && (!mentionQuery || (p.user && p.user.name.toLowerCase().includes(mentionQuery)))
  );

  return (
    <div className="z-20 p-3 pb-[max(env(safe-area-inset-bottom,12px),12px)] bg-surface border-t border-[var(--border)]/50 shrink-0 relative">
      {/* Quick Actions (Nana session) */}
      {isNanaSession && messages.length > 0 && !newMessage.trim() && !isInputFocused && (
        <div className="flex items-center space-x-2 px-1 mb-3 overflow-x-auto no-scrollbar pb-1 transition-all duration-300">
          {quickActions.map((action, idx) => (
            <button
              key={idx}
              onClick={() => onSendMessage(null, action.query)}
              className="whitespace-nowrap px-4 py-2 bg-surface-2 border border-[var(--border)]/50 rounded-full text-[10px] font-extrabold text-app-secondary hover:bg-primary-50 hover:text-primary-600 hover:border-primary-200 flex items-center gap-1.5 shadow-sm"
            >
              <span>{action.label.split(' ')[0]}</span>
              <span>{action.label.split(' ').slice(1).join(' ')}</span>
            </button>
          ))}
        </div>
      )}

      {/* Emoji Picker */}
      {showEmojiPicker && (
        <div className="absolute bottom-full right-4 mb-4 z-50 shadow-2xl bg-white rounded-2xl overflow-hidden border border-gray-200">
          <React.Suspense fallback={<div className="p-4 text-center text-sm text-gray-500">Loading emojis...</div>}>
            <EmojiPicker
              onEmojiClick={(emojiData) => { setNewMessage(p => p + emojiData.emoji); setShowEmojiPicker(false); }}
              lazyLoadEmojis={true}
              autoFocusSearch={false}
              width={320}
              height={400}
            />
          </React.Suspense>
        </div>
      )}

      {/* Mention Picker */}
      {showMentionPicker && participants.length > 0 && (
        <div className="absolute bottom-full left-4 mb-2 min-w-[220px] max-w-[80vw] max-h-48 overflow-y-auto bg-surface border border-[var(--border)]/50 shadow-2xl rounded-xl z-50 no-scrollbar">
          {filteredParticipants.length > 0 ? (
            filteredParticipants.map(p => (
              <button
                key={p.userId}
                type="button"
                onClick={() => handleMentionSelect(p)}
                className="w-full flex items-center gap-3 p-2.5 hover:bg-surface-2 text-left border-b border-[var(--border)]/50 last:border-none"
              >
                <div className="w-7 h-7 rounded-lg bg-primary-100 text-primary-600 flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
                  {p.user?.avatar ? <img src={getFullFileUrl(p.user.avatar)} className="w-full h-full object-cover" /> : getInitials(p.user?.name)}
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-app-primary leading-tight">{p.user?.name}</span>
                  <span className="text-[9px] font-semibold text-app-secondary uppercase tracking-widest">{p.role || 'Member'}</span>
                </div>
              </button>
            ))
          ) : (
            <div className="p-3 text-center text-xs font-bold text-app-secondary uppercase tracking-widest">No matching users</div>
          )}
        </div>
      )}

      {/* Input Form */}
      <form onSubmit={onSendMessage} className="flex flex-col space-y-2">
        {/* Reply Preview */}
        {replyTo && (
          <div className="flex items-center justify-between bg-surface-2 p-2 rounded-xl border-l-4 border-primary-500 mx-1 mb-1">
            <div className="flex-1 min-w-0 px-2">
              <p className="text-[9px] font-black text-primary-600 uppercase tracking-widest">Replying to {replyTo.sender?.name}</p>
              <p className="text-xs text-app-secondary truncate">{replyTo.content || 'Attachment'}</p>
            </div>
            <button type="button" onClick={onClearReply} className="p-1 text-app-secondary hover:text-app-primary">
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Media Preview */}
        {mediaFile && (
          <div className="flex items-center justify-between bg-primary-50 p-2 rounded-xl border border-primary-100 mx-1">
            <div className="flex items-center space-x-2">
              <DocumentIcon className="w-4 h-4 text-primary-600" />
              <span className="text-[10px] font-black text-primary-800 truncate max-w-[200px]">{mediaFile.name}</span>
            </div>
            <button onClick={() => setMediaFile(null)}><XMarkIcon className="w-4 h-4 text-primary-400 hover:text-red-500" /></button>
          </div>
        )}

        {/* Input Row */}
        <div className="flex items-end space-x-2">
          {!isRecording ? (
            <>
              <button
                type="button"
                disabled={!canSend}
                onClick={() => fileInputRef.current?.click()}
                className="p-2.5 text-app-secondary hover:bg-surface-2 rounded-2xl disabled:opacity-30 disabled:grayscale"
              >
                <PaperClipIcon className="w-5 h-5 stroke-[2.5px]" />
                <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileSelect} />
              </button>

              <div className="flex-1 flex items-center rounded-2xl bg-surface-2 p-1">
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="p-2 text-app-secondary hover:text-primary-600"
                >
                  <FaceSmileIcon className="w-5 h-5 stroke-[2.2px]" />
                </button>
                <textarea
                  value={newMessage}
                  onChange={onInputChange}
                  disabled={!canSend}
                  onPaste={handlePaste}
                  aria-label="Type your message"
                  style={{ outline: 'none', boxShadow: 'none' }}
                  className="flex-1 bg-transparent border-none text-sm py-2 px-1 max-h-32 resize-none focus:ring-0 focus:outline-none font-medium disabled:text-app-secondary"
                  rows={1}
                  onFocus={() => setIsInputFocused(true)}
                  onBlur={() => setIsInputFocused(false)}
                  onKeyDown={handleKeyDown}
                />
              </div>

              {newMessage.trim() || mediaFile ? (
                <button
                  type="submit"
                  disabled={isSending || !canSend}
                  className="p-3 bg-primary-600 text-white rounded-[18px] shadow-lg shadow-primary-600/30 active: disabled:opacity-30 disabled:grayscale"
                >
                  {isSending ? <ArrowPathIcon className="w-5 h-5" /> : <PaperAirplaneIcon className="w-5 h-5 -" />}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={!canSend}
                  onClick={onStartRecording}
                  className="p-3 text-primary-600 hover:bg-primary-50 rounded-[18px] disabled:opacity-30 disabled:grayscale"
                >
                  <MicrophoneIcon className="w-6 h-6" />
                </button>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-between bg-red-50 p-2 rounded-2xl border border-red-100">
              <div className="flex items-center space-x-3 px-2">
                <div className="w-2.5 h-2.5 bg-red-500 rounded-full" />
                <span className="text-xs font-black text-red-600 tracking-tighter uppercase">Recording Voice Note...</span>
              </div>
              <button
                type="button"
                onClick={onStopRecording}
                className="p-2 bg-red-600 text-white rounded-xl shadow-lg shadow-red-600/20"
              >
                <StopCircleIcon className="w-6 h-6" />
              </button>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
