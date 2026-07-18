import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeftIcon,
  EllipsisVerticalIcon,
  VideoCameraIcon,
  PhoneIcon,
  TrashIcon,
  CalendarDaysIcon,
  LinkIcon,
  XMarkIcon,
  PhotoIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { getInitials, getAvatarColor, getFullFileUrl } from '../utils/helpers';
import { formatDistanceToNow } from 'date-fns';

/**
 * Chat header with avatar, name, status, search, and menu.
 */
export default function ChatHeader({
  conversation,
  otherParticipant,
  name,
  isOnline,
  typingUsers,
  showSearch,
  setShowSearch,
  searchQuery,
  setSearchQuery,
  setShowProfile,
  handleStartCall,
  handleSendCallLink,
  handleScheduleCall,
  handleClearChat,
  setShowMediaGallery,
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [imgError, setImgError] = useState(false);

  return (
    <header
      className="w-full z-[100] flex flex-col border-b shrink-0"
      style={{ background: 'var(--bg-navbar)', color: 'var(--text-navbar)', borderColor: 'var(--border)' }}
    >
      <div className="flex items-center justify-between px-3 pt-[max(env(safe-area-inset-top,0px),4px)] pb-1 min-h-[48px]">
        {/* Left: back + avatar + name */}
        <div className="flex items-center space-x-3 min-w-0">
          <Link
            href="/"
            className="p-2 -ml-1"
            style={{ color: 'color-mix(in srgb, var(--text-navbar), transparent 20%)' }}
          >
            <ArrowLeftIcon className="w-5 h-5 stroke-[2.5px]" />
          </Link>

          <div
            className="flex items-center space-x-3 cursor-pointer min-w-0"
            onClick={() => setShowProfile(true)}
          >
            <div className="relative">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold overflow-hidden ring-2 ring-white/30"
                style={{
                  background: otherParticipant?.user?.role === 'NANA' ? 'linear-gradient(to top right, var(--primary), var(--indigo))' : 'rgba(255,255,255,0.2)',
                  color: '#ffffff'
                }}
              >
                {(() => {
                  const isNana = otherParticipant?.user?.role === 'NANA';
                  if (isNana) return 'N';
                  const avatar = conversation?.avatar || otherParticipant?.user?.avatar;
                  const fullUrl = getFullFileUrl(avatar);
                  return (
                    <>
                      {fullUrl && !imgError ? (
                        <img
                          src={fullUrl}
                          className="w-full h-full object-cover rounded-full"
                          alt=""
                          onError={() => setImgError(true)}
                        />
                      ) : (
                        <div className={`w-full h-full rounded-full bg-gradient-to-tr ${getAvatarColor(name)} flex items-center justify-center`}>
                          {getInitials(name)}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
              {isOnline && (
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 border-2 border-white rounded-full"></span>
              )}
            </div>

            <div className="min-w-0">
              <h1 className="font-bold truncate text-[15px] leading-tight flex items-center" style={{ color: 'var(--text-navbar)' }}>
                {name}
                {conversation?.course?.announcementsOnly && (
                  <span className="ml-2 px-1.5 py-0.5 bg-surface/20 rounded text-[8px] font-black tracking-widest uppercase border border-white/10" style={{ color: 'var(--text-navbar)' }}>
                    Announcements
                  </span>
                )}
              </h1>
              <p className="text-[11px] font-medium flex items-center" style={{ color: 'color-mix(in srgb, var(--text-navbar), transparent 30%)' }}>
                {conversation?.course?.announcementsOnly ? (
                  <span className="flex items-center">
                    <div className="w-1.5 h-1.5 bg-rose-400 rounded-full mr-1.5" />
                    Locked by Lecturer
                  </span>
                ) : (
                  typingUsers.length > 0 ? (
                    <span className="text-primary-400 font-bold">
                      {typingUsers.length === 1 ? 'typing...' : 'several people typing...'}
                    </span>
                  ) : (
                    isOnline ? 'Online' : (
                      otherParticipant?.user?.lastSeen ? (
                        `Last seen ${formatDistanceToNow(new Date(otherParticipant.user.lastSeen), { addSuffix: true })}`
                      ) : 'Offline'
                    )
                  )
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Right: search + menu */}
        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => setShowSearch(!showSearch)}
            className={`w-9 h-9 rounded-full flex items-center justify-center  ${showSearch ? 'bg-black/10' : 'bg-black/5 hover:bg-black/10'}`}
            style={{ color: 'var(--text-navbar)' }}
          >
            <MagnifyingGlassIcon className="w-4.5 h-4.5" style={{ width: '18px', height: '18px'}} />
          </button>
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="w-9 h-9 rounded-full bg-black/5 flex items-center justify-center hover:bg-black/10"
              style={{ color: 'var(--text-navbar)' }}
            >
              <EllipsisVerticalIcon className="w-4.5 h-4.5" style={{ width: '18px', height: '18px'}} />
            </button>

            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-56 bg-surface rounded-2xl border border-[var(--divider)] z-50 overflow-hidden">
                  <div className="p-2 border-b border-slate-50">
                    <div className="px-3 py-2 text-[10px] font-bold text-app-muted uppercase tracking-widest">
                      Conversation Options
                    </div>
                  </div>
                  <div className="p-2 space-y-1">
                    <button
                      onClick={() => { setShowMediaGallery(true); setShowMenu(false); }}
                      className="w-full flex items-center space-x-3 px-3 py-2.5 text-sm font-bold text-slate-700 hover:bg-primary-50 hover:text-primary-600 rounded-xl text-left"
                    >
                      <PhotoIcon className="w-4 h-4" />
                      <span>View Media & Files</span>
                    </button>
                    <button
                      disabled={!otherParticipant}
                      onClick={() => { handleStartCall('VOICE'); setShowMenu(false); }}
                      className="w-full flex items-center space-x-3 px-3 py-2.5 text-sm font-bold text-slate-700 hover:bg-primary-50 hover:text-primary-600 rounded-xl text-left disabled:opacity-30"
                    >
                      <PhoneIcon className="w-4 h-4" />
                      <span>Voice Call</span>
                    </button>
                    <button
                      disabled={!otherParticipant}
                      onClick={() => { handleStartCall('VIDEO'); setShowMenu(false); }}
                      className="w-full flex items-center space-x-3 px-3 py-2.5 text-sm font-bold text-slate-700 hover:bg-primary-50 hover:text-primary-600 rounded-xl text-left disabled:opacity-30"
                    >
                      <VideoCameraIcon className="w-4 h-4" />
                      <span>Video Call</span>
                    </button>
                    <button
                      onClick={handleSendCallLink}
                      className="w-full flex items-center space-x-3 px-3 py-2.5 text-sm font-bold text-slate-700 hover:bg-primary-50 hover:text-primary-600 rounded-xl text-left"
                    >
                      <LinkIcon className="w-4 h-4" />
                      <span>Send Call Link</span>
                    </button>
                    <button
                      onClick={handleScheduleCall}
                      className="w-full flex items-center space-x-3 px-3 py-2.5 text-sm font-bold text-slate-700 hover:bg-primary-50 hover:text-primary-600 rounded-xl text-left"
                    >
                      <CalendarDaysIcon className="w-4 h-4" />
                      <span>Schedule Call</span>
                    </button>
                    <div className="h-px bg-app my-1 mx-2" />
                    <button
                      onClick={handleClearChat}
                      className="w-full flex items-center space-x-3 px-3 py-2.5 text-sm font-bold text-red-500 hover:bg-red-50 rounded-xl text-left"
                    >
                      <TrashIcon className="w-4 h-4" />
                      <span>Clear All Chat</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Search Bar */}
      {showSearch && (
        <div className="w-full bg-page border-t border-[var(--border)]/50 px-4 py-2 flex items-center" style={{ background: 'var(--bg-page)', borderColor: 'var(--border)' }}>
          <input
            autoFocus
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search in conversation..."
            className="w-full rounded-2xl py-2 px-4 text-sm outline-none border focus:ring-2 focus:ring-primary-500/20"
            style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)', borderColor: 'var(--border)' }}
          />
          <button onClick={() => { setShowSearch(false); setSearchQuery(''); }} className="ml-2 p-1.5 rounded-full hover:bg-black/5 text-app-secondary flex-shrink-0">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
      )}
    </header>
  );
}
