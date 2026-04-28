import { 
  PaperClipIcon, 
  MicrophoneIcon, 
  DocumentIcon, 
  ChevronDoubleRightIcon, 
  XMarkIcon, 
  PlayIcon, 
  PauseIcon, 
  ArrowDownTrayIcon, 
  PhotoIcon, 
  VideoCameraIcon, 
  MusicalNoteIcon 
} from '@heroicons/react/24/outline';
import { formatFileSize, getFullFileUrl } from '../utils/helpers';
import React, { useState, useRef, useMemo } from 'react';

export const AttachmentBubble = React.memo(({ message, onLoad }) => {
  const isImage = message.type === 'IMAGE' || (message.fileName && /\.(jpg|jpeg|png|gif|webp)$/i.test(message.fileName));
  const isVideo = message.fileName && /\.(mp4|webm|mov|ogg)$/i.test(message.fileName);
  const [hasError, setHasError] = useState(false);
  const fullUrl = getFullFileUrl(message.fileUrl);

  if (isImage) {
    if (hasError) {
      return (
        <div className="mt-1 flex items-center space-x-3 bg-app/50 p-4 rounded-2xl border border-[var(--border)] min-w-[200px]">
          <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center text-red-500">
            <XMarkIcon className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-[10px] font-black text-red-600 uppercase tracking-widest leading-none">Media Error</p>
          </div>
        </div>
      );
    }
    return (
      <div className="mt-1 group relative">
        <img
          src={fullUrl}
          alt={message.fileName || "Image attachment"}
          loading="lazy"
          onLoad={onLoad}
          onError={() => setHasError(true)}
          className="max-w-full rounded-2xl border border-[var(--border)] shadow-sm cursor-pointer max-h-[300px] min-w-[150px] object-cover"
        />
        {!hasError && (
          <a
            href={fullUrl}
            download={message.fileName}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute bottom-2 right-2 p-2 bg-black/40 backdrop-blur-md text-white rounded-xl opacity-0 group-hover:opacity-100"
          >
            <ArrowDownTrayIcon className="w-4 h-4" />
          </a>
        )}
      </div>
    );
  }

  if (isVideo) {
    return (
      <div className="mt-1 group relative rounded-2xl overflow-hidden border border-[var(--border)] bg-black max-w-full min-w-[200px]">
        <video src={fullUrl} controls={true} className="max-w-full max-h-[300px] w-full" preload="metadata" />
        <div className="absolute top-2 left-2 px-2 py-1 bg-black/40 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-widest rounded-lg pointer-events-none">
          Video
        </div>
      </div>
    );
  }

  return (
    <div className="mt-1 flex items-center space-x-3 bg-surface/10 p-3 rounded-2xl border border-[var(--border)] min-w-[200px]">
      <div className="p-2.5 bg-surface/20 rounded-xl">
        <DocumentIcon className="w-6 h-6 text-app-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-black text-app-primary truncate leading-tight uppercase tracking-tight">{message.fileName}</p>
        <p className="text-[10px] text-app-muted font-bold mt-0.5">{formatFileSize(message.fileSize)}</p>
      </div>
      <a href={fullUrl} download={message.fileName} className="p-2 hover:bg-surface/20 rounded-xl text-app-primary">
        <ArrowDownTrayIcon className="w-4 h-4" />
      </a>
    </div>
  );
});

export const VoiceBubble = React.memo(({ message }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);
  const fullUrl = getFullFileUrl(message.fileUrl);

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
    <div className="mt-1 flex items-center space-x-3 bg-primary-600/10 p-3 rounded-2xl border border-primary-600/20 min-w-[180px]">
      <button
        onClick={handlePlay}
        className="w-10 h-10 flex items-center justify-center bg-surface text-primary-600 rounded-full shadow-lg"
      >
        {isPlaying ? <PauseIcon className="w-5 h-5 fill-current" /> : <PlayIcon className="w-5 h-5 fill-current" />}
      </button>
      <div className="flex-1 space-y-1">
        <div className="flex items-center space-x-1">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <div key={i} className="h-4 w-1 bg-primary-600/40 rounded-full"></div>
          ))}
        </div>
        <audio
          ref={audioRef}
          onEnded={() => setIsPlaying(false)}
          onError={(e) => {
            console.error("Audio error:", e);
            setIsPlaying(false);
          }}
          className="hidden"
          preload="metadata"
        >
          <source src={fullUrl} type={fullUrl?.includes('.m4a') ? 'audio/mp4' : 'audio/webm'} />
        </audio>
        <p className="text-[10px] text-app-primary/70 font-black uppercase tracking-widest leading-none">Voice Memo</p>
      </div>
    </div>
  );
});

export const SharedMediaGallery = ({ messages = [] }) => {
  const [activeTab, setActiveTab] = useState('MEDIA'); // MEDIA, DOCS, LINKS

  const filteredMedia = useMemo(() => {
    return messages.filter(m => {
      if (activeTab === 'MEDIA') {
        const isImg = m.type === 'IMAGE' || (m.fileName && /\.(jpg|jpeg|png|gif|webp)$/i.test(m.fileName));
        const isVid = m.fileName && /\.(mp4|webm|mov|ogg)$/i.test(m.fileName);
        const isVoice = m.type === 'VOICE';
        return isImg || isVid || isVoice;
      }
      if (activeTab === 'DOCS') {
        return m.type === 'FILE' && !(m.fileName && /\.(jpg|jpeg|png|gif|webp|mp4|webm|mov|ogg)$/i.test(m.fileName));
      }
      if (activeTab === 'LINKS') {
        return m.content && m.content.includes('http');
      }
      return false;
    });
  }, [messages, activeTab]);

  const getUrl = (m) => getFullFileUrl(m.fileUrl);

  return (
    <div className="flex flex-col h-full bg-app">
      <div className="flex items-center justify-around p-2 bg-surface border-b border-[var(--border)]">
        {[
          { id: 'MEDIA', icon: PhotoIcon, label: 'Media' },
          { id: 'DOCS', icon: DocumentIcon, label: 'Docs' },
          { id: 'LINKS', icon: ChevronDoubleRightIcon, label: 'Links' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center flex-1 py-3 px-1 space-y-1 relative ${
              activeTab === tab.id ? 'text-primary-600' : 'text-app-muted'
            }`}
          >
            <tab.icon className="w-5 h-5" />
            <span className="text-[10px] font-black uppercase tracking-widest">{tab.label}</span>
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary-600 rounded-t-full mx-4" />
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 content-start">
        {filteredMedia.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-app-muted opacity-60">
            <div className="w-16 h-16 rounded-3xl bg-surface-2 flex items-center justify-center mb-4">
              {activeTab === 'MEDIA' ? <PhotoIcon className="w-8 h-8" /> : (activeTab === 'DOCS' ? <DocumentIcon className="w-8 h-8" /> : <ChevronDoubleRightIcon className="w-8 h-8" />)}
            </div>
            <p className="font-black text-[10px] uppercase tracking-widest">No shared {activeTab.toLowerCase()} yet</p>
          </div>
        ) : (
          <div className={`grid gap-2 ${activeTab === 'MEDIA' ? 'grid-cols-3' : 'grid-cols-1'}`}>
            {filteredMedia.map(m => {
              const url = getUrl(m);
              if (activeTab === 'MEDIA') {
                const isVoice = m.type === 'VOICE';
                return (
                  <div key={m.id} className="aspect-square rounded-xl overflow-hidden bg-surface-3 relative group border border-[var(--border)] shadow-sm">
                    {isVoice ? (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-primary-50">
                        <MusicalNoteIcon className="w-6 h-6 text-primary-400" />
                        <span className="text-[8px] font-black text-primary-600 mt-1">VOICE</span>
                      </div>
                    ) : m.fileName && /\.(mp4|webm|mov|ogg)$/i.test(m.fileName) ? (
                      <>
                        <video src={url} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                          <PlayIcon className="w-6 h-6 text-white" />
                        </div>
                      </>
                    ) : (
                      <img src={url} loading="lazy" decoding="async" alt={m.fileName} className="w-full h-full object-cover" />
                    )}
                    <a href={url} download={m.fileName} className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40">
                      <ArrowDownTrayIcon className="w-6 h-6 text-white" />
                    </a>
                  </div>
                );
              }
              if (activeTab === 'DOCS') {
                return (
                  <a key={m.id} href={url} download={m.fileName} className="flex items-center space-x-3 p-4 bg-surface rounded-2xl border border-[var(--border)] shadow-sm">
                    <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-500">
                      <DocumentIcon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-app-primary truncate uppercase tracking-tight">{m.fileName}</p>
                      <p className="text-[10px] text-app-muted font-bold mt-0.5">{formatFileSize(m.fileSize)}</p>
                    </div>
                    <ArrowDownTrayIcon className="w-4 h-4 text-slate-300" />
                  </a>
                );
              }
              if (activeTab === 'LINKS') {
                const match = m.content.match(/https?:\/\/[^\s]+/g);
                const link = match ? match[0] : '#';
                return (
                  <a key={m.id} href={link} target="_blank" rel="noopener noreferrer" className="flex items-center space-x-3 p-4 bg-surface rounded-2xl border border-[var(--border)] shadow-sm hover:border-primary-600/20">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500">
                      <ChevronDoubleRightIcon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-app-primary truncate lowercase tracking-tight">{link}</p>
                      <p className="text-[10px] text-app-muted font-bold mt-0.5">Shared Link</p>
                    </div>
                  </a>
                );
              }
              return null;
            })}
          </div>
        )}
      </div>
    </div>
  );
};