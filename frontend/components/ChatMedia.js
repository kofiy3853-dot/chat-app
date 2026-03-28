import { 
  PaperClipIcon, 
  MicrophoneIcon, 
  DocumentIcon, 
  ChevronDoubleRightIcon,
  XMarkIcon,
  PlayIcon,
  PauseIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import { formatFileSize } from '../utils/helpers';
import React, { useState, useRef } from 'react';

export const AttachmentBubble = ({ message }) => {
  const isImage = message.type === 'IMAGE' || (message.fileName && /\.(jpg|jpeg|png|gif)$/i.test(message.fileName));
  const baseUrl = process.env.NEXT_PUBLIC_API_URL ? process.env.NEXT_PUBLIC_API_URL.split('/api')[0] : 'http://localhost:5000';
  const fullUrl = message.fileUrl ? `${baseUrl}${message.fileUrl}` : null;

  if (isImage) {
    return (
      <div className="mt-1 group relative">
        <img 
          src={fullUrl} 
          alt={message.fileName} 
          className="max-w-full rounded-2xl border border-slate-100 shadow-sm transition-all hover:brightness-95 cursor-pointer max-h-[300px] object-cover"
        />
        <a 
          href={fullUrl} 
          download={message.fileName}
          className="absolute bottom-2 right-2 p-2 bg-black/40 backdrop-blur-md text-white rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <ArrowDownTrayIcon className="w-4 h-4" />
        </a>
      </div>
    );
  }

  return (
    <div className="mt-1 flex items-center space-x-3 bg-white/10 backdrop-blur-sm p-3 rounded-2xl border border-white/20 min-w-[200px]">
      <div className="p-2.5 bg-white/20 rounded-xl shadow-inner">
        <DocumentIcon className="w-6 h-6 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-black text-white truncate leading-tight uppercase tracking-tight">{message.fileName}</p>
        <p className="text-[10px] text-white/70 font-bold mt-0.5">{formatFileSize(message.fileSize)}</p>
      </div>
      <a 
        href={fullUrl} 
        download={message.fileName}
        className="p-2 hover:bg-white/20 rounded-xl transition-all"
      >
        <ArrowDownTrayIcon className="w-4 h-4 text-white" />
      </a>
    </div>
  );
};

export const VoiceBubble = ({ message }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);
  const baseUrl = process.env.NEXT_PUBLIC_API_URL ? process.env.NEXT_PUBLIC_API_URL.split('/api')[0] : 'http://localhost:5000';
  const fullUrl = message.fileUrl ? `${baseUrl}${message.fileUrl}` : null;

  const handlePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(e => console.error("Playback failed:", e));
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="mt-1 flex items-center space-x-3 bg-primary-500/20 backdrop-blur-md p-3 rounded-2xl border border-white/10 min-w-[180px]">
      <button 
        onClick={handlePlay}
        className="w-10 h-10 flex items-center justify-center bg-white text-primary-600 rounded-full shadow-lg transform active:scale-90 transition-all"
      >
        {isPlaying ? <PauseIcon className="w-5 h-5 fill-current" /> : <PlayIcon className="w-5 h-5 fill-current" />}
      </button>
      <div className="flex-1 space-y-1">
        <div className="flex items-center space-x-1">
          {[1,2,3,4,5,6,7,8].map(i => (
            <div 
              key={i} 
              className={`h-4 w-1 bg-white/40 rounded-full ${isPlaying ? 'animate-pulse' : ''}`} 
              style={{ animationDelay: `${i*0.1}s` }}
            ></div>
          ))}
        </div>
        <audio 
          ref={audioRef}
          src={fullUrl} 
          onEnded={() => setIsPlaying(false)}
          onError={(e) => {
            console.error("Audio playback error:", e);
            setIsPlaying(false);
          }}
          className="hidden" 
        />
        <p className="text-[10px] text-white/70 font-black uppercase tracking-widest leading-none">Voice Memo</p>
      </div>
    </div>
  );
};
