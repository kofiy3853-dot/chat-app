import React, { useState, useEffect, useRef } from 'react';
import { XMarkIcon, ChevronLeftIcon, ChevronRightIcon, TrashIcon, EyeIcon, PaperAirplaneIcon } from '@heroicons/react/24/solid';
import { getFullFileUrl, getInitials, formatRelativeTime, getCurrentUser } from '../utils/helpers';
import { toast } from 'react-hot-toast';

interface Status {
  id: string;
  type: 'TEXT' | 'IMAGE' | 'VIDEO';
  contentUrl?: string;
  textContent?: string;
  backgroundColor?: string;
  caption?: string;
  createdAt: string;
  viewCount?: number;
}

interface UserGroupedStatus {
  user: {
    id: string;
    name: string;
    avatar?: string;
  };
  statuses: Status[];
}

interface StatusViewerProps {
  groups: UserGroupedStatus[];
  initialGroupIndex: number;
  onClose: () => void;
  onViewStatus: (statusId: string) => void;
  onDeleteStatus?: (statusId: string) => void;
  onReply?: (status: Status, message: string, userId: string) => Promise<void>;
}

const StatusViewer: React.FC<StatusViewerProps> = ({ 
  groups, 
  initialGroupIndex, 
  onClose,
  onViewStatus,
  onDeleteStatus,
  onReply
}) => {
  const [groupIndex, setGroupIndex] = useState(initialGroupIndex);
  const [statusIndex, setStatusIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const progressInterval = useRef<NodeJS.Timeout | null>(null);
  const currentUser = getCurrentUser();

  const currentGroup = groups[groupIndex];
  const currentStatus = currentGroup?.statuses[statusIndex];

  useEffect(() => {
    if (!currentStatus) return;

    // Reset progress when status changes
    setProgress(0);
    onViewStatus(currentStatus.id);

    const DURATION = 5000; // 5 seconds per status
    const STEP = 100 / (DURATION / 50); // Progress step every 50ms

    if (progressInterval.current) clearInterval(progressInterval.current);

    if (!isSending) {
        progressInterval.current = setInterval(() => {
        setProgress((prev) => {
            if (prev >= 100) {
            handleNext();
            return 100;
            }
            return prev + STEP;
        });
        }, 50);
    }

    return () => {
      if (progressInterval.current) clearInterval(progressInterval.current);
    };
  }, [groupIndex, statusIndex, isSending]);

  const handleNext = () => {
    if (statusIndex < currentGroup.statuses.length - 1) {
      setStatusIndex(statusIndex + 1);
    } else if (groupIndex < groups.length - 1) {
      setGroupIndex(groupIndex + 1);
      setStatusIndex(0);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (statusIndex > 0) {
      setStatusIndex(statusIndex - 1);
    } else if (groupIndex > 0) {
      setGroupIndex(groupIndex - 1);
      setStatusIndex(groups[groupIndex - 1].statuses.length - 1);
    } else {
      setStatusIndex(0);
    }
  };

  const handleDelete = () => {
    if (!currentStatus || !onDeleteStatus) return;
    if (window.confirm('Delete this status update?')) {
      onDeleteStatus(currentStatus.id);
    }
  };

  const handleReplySubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!replyText.trim() || !onReply || !currentStatus || isSending) return;

    setIsSending(true);
    try {
      await onReply(currentStatus, replyText, currentGroup.user.id);
      setReplyText('');
      toast.success('Reply sent!');
    } catch (err) {
      toast.error('Failed to send reply');
    } finally {
      setIsSending(false);
    }
  };

  if (!currentGroup || !currentStatus) return null;

  const isOwner = currentUser && currentUser.id === currentGroup.user.id;

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-4 touch-none">
      {/* Tap Areas for Navigation */}
      <div className="absolute inset-0 flex z-10">
        <div className="w-1/3 h-full" onClick={handlePrev} />
        <div className="w-2/3 h-full" onClick={handleNext} />
      </div>

      {/* Progress Bars */}
      <div className="absolute top-10 left-4 right-4 flex space-x-1.5 z-20">
        {currentGroup.statuses.map((_, idx) => (
          <div key={idx} className="h-1 flex-1 bg-surface/20 rounded-full overflow-hidden">
            <div 
              className="h-full bg-surface" 
              style={{ 
                width: idx < statusIndex ? '100%' : idx === statusIndex ? `${progress}%` : '0%' 
              }}
            />
          </div>
        ))}
      </div>

      {/* Header Info */}
      <div className="absolute top-14 left-0 right-0 px-6 flex items-center justify-between z-20">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-surface/20 backdrop-blur-md overflow-hidden border border-white/20 p-0.5">
             {currentGroup.user.avatar ? (
                <img src={getFullFileUrl(currentGroup.user.avatar)} className="w-full h-full object-cover rounded-xl" alt="" />
             ) : (
                <div className={`w-full h-full flex items-center justify-center text-white text-sm font-black rounded-xl bg-primary-500`}>
                    {getInitials(currentGroup.user.name)}
                </div>
             )}
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-black text-white tracking-tight leading-none mb-0.5">{currentGroup.user.name}</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-white/50">{formatRelativeTime(currentStatus.createdAt)}</span>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {isOwner && (
            <button 
              onClick={(e) => { e.stopPropagation(); handleDelete(); }} 
              title="Delete status"
              aria-label="Delete status"
              className="p-2 bg-red-500/10 hover:bg-red-500/20 rounded-full active: mr-1"
            >
              <TrashIcon className="w-6 h-6 text-red-500" />
            </button>
          )}
          <button 
            onClick={(e) => { e.stopPropagation(); onClose(); }} 
            title="Close viewer"
            aria-label="Close viewer"
            className="p-2 bg-surface/10 hover:bg-surface/20 rounded-full active:"
          >
            <XMarkIcon className="w-6 h-6 text-white" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="w-full max-w-lg h-[80vh] flex items-center justify-center relative bg-[#111] rounded-3xl overflow-hidden shadow-2xl">
        {currentStatus.type === 'TEXT' ? (
          <div 
            className="w-full h-full flex flex-col items-center justify-center p-12 text-center"
            style={{ backgroundColor: currentStatus.backgroundColor || '#6B73FF' }}
          >
            <p className="text-3xl font-black text-white leading-tight drop-shadow-lg tracking-tight">
              {currentStatus.textContent}
            </p>
          </div>
        ) : (
          <div className="w-full h-full relative">
            <img 
              src={getFullFileUrl(currentStatus.contentUrl)} 
              className="w-full h-full object-contain" 
              alt="" 
            />
            {currentStatus.caption && (
               <div className="absolute bottom-16 left-0 right-0 px-8 py-10 bg-gradient-to-t from-black/80 to-transparent">
                  <p className="text-white text-center font-bold text-lg leading-snug drop-shadow-md">
                     {currentStatus.caption}
                  </p>
               </div>
            )}
          </div>
        )}
      </div>

      {/* Footer: View Count or Reply Input */}
      <div className="absolute bottom-8 left-0 right-0 px-6 z-30 flex flex-col items-center">
        {isOwner ? (
          <div className="flex items-center space-x-2 bg-surface/10 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/20 shadow-xl transiton-all">
            <EyeIcon className="w-4 h-4 text-white" />
            <span className="text-white text-xs font-black tracking-tight">
              {currentStatus.viewCount || 0} {(currentStatus.viewCount || 0) === 1 ? 'View' : 'Views'}
            </span>
          </div>
        ) : (
          <form 
            onSubmit={handleReplySubmit} 
            onClick={(e) => e.stopPropagation()} 
            className="w-full max-w-sm flex items-center space-x-2 bg-surface/10 backdrop-blur-xl p-1.5 pl-4 rounded-2xl border border-white/20 group focus-within:bg-surface/20"
          >
            <input 
              type="text"
              placeholder="Reply to status..."
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onFocus={() => { if (progressInterval.current) clearInterval(progressInterval.current); }}
              onBlur={() => { /* Resume logic if desired */ }}
              className="flex-1 bg-transparent border-none text-white text-sm placeholder:text-white/40 focus:ring-0 py-2"
            />
            <button 
              type="submit"
              disabled={!replyText.trim() || isSending}
              title="Send reply"
              aria-label="Send reply"
              className="p-2 bg-primary-500 text-white rounded-xl shadow-lg disabled:opacity-50 disabled:grayscale active:"
            >
              {isSending ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full" />
              ) : (
                <PaperAirplaneIcon className="w-5 h-5 -" />
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default StatusViewer;
