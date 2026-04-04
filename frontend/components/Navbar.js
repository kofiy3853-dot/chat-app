import Link from 'next/link';
import { useRouter } from 'next/router';
import { 
  ChatBubbleLeftIcon, 
  AcademicCapIcon, 
  BellIcon, 
  UserCircleIcon,
  PlusIcon,
  CalendarDaysIcon,
  BuildingLibraryIcon
} from '@heroicons/react/24/outline';
import { useState, useEffect } from 'react';
import NewChatModal from './NewChatModal';
import { getSocket } from '../services/socket';
import { userAPI, chatAPI } from '../services/api';

export default function Navbar() {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);

  useEffect(() => {
    // 1. Fetch initial counts immediately on mount
    const fetchInitialCounts = async () => {
      try {
        const [notifRes, chatRes] = await Promise.all([
          userAPI.getUnreadCount(),
          chatAPI.getUnreadChatCount()
        ]);
        if (notifRes?.data?.count !== undefined) setUnreadCount(notifRes.data.count);
        if (chatRes?.data?.count !== undefined) setChatUnreadCount(chatRes.data.count);
      } catch (error) {
        console.error('Failed to fetch unread counts:', error);
      }
    };
    
    if (typeof window !== 'undefined' && localStorage.getItem('token')) {
      fetchInitialCounts();
    }

    // 2. Set up socket listeners
    let socket;
    const setupListeners = () => {
      socket = getSocket();
      if (socket) {
        // Live updates from socket
        socket.on('new-notification', (data) => {
          setUnreadCount(data.unreadCount);
        });

        socket.on('unread-count', (data) => {
          setUnreadCount(data.count);
        });

        // Add handler for new messages across any conversation
        socket.on('new-message', (data) => {
          // If the message is from someone else, refresh the total unread count
          if (data.message.senderId !== JSON.parse(localStorage.getItem('user'))?.id) {
            chatAPI.getUnreadChatCount()
              .then(r => { if (r?.data?.count !== undefined) setChatUnreadCount(r.data.count); })
              .catch(() => {});
          }
        });

        // Handle total unread refresh from backend (optional depending on implementation)
        socket.on('total-unread-chat-count', (data) => {
          setChatUnreadCount(data.count);
        });

        // If socket reconnects, re-sync everything
        socket.on('connect', () => {
           fetchInitialCounts();
        });

        return true;
      }
      return false;
    };

    if (!setupListeners()) {
      const interval = setInterval(() => {
        if (setupListeners()) clearInterval(interval);
      }, 2000);
      return () => {
        clearInterval(interval);
        if (socket) {
          socket.off('new-notification');
          socket.off('unread-count');
          socket.off('connect');
        }
      };
    }

    return () => {
      if (socket) {
        socket.off('new-notification');
        socket.off('unread-count');
        socket.off('new-message');
        socket.off('total-unread-chat-count');
        socket.off('connect');
      }
    };
  }, []);

  const isActive = (path) => router.pathname === path;

  const navItems = [
    { href: '/', icon: ChatBubbleLeftIcon, label: 'Inbox' },
    { href: '/courses', icon: AcademicCapIcon, label: 'Courses' },
    { href: '/activity', icon: BellIcon, label: 'Activity' },
    { href: '/account', icon: UserCircleIcon, label: 'Account' },
  ];

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-xl z-40 px-5 pb-5 pt-2 pointer-events-none">
      <div
        className="flex justify-between items-center rounded-2xl h-16 px-3 pointer-events-auto"
        style={{
          backgroundColor: 'var(--primary)',          /* sea blue */
          boxShadow: '0 -4px 24px var(--primary-shadow)'
        }}
      >
        {/* Chats */}
        <Link
          href="/"
          className="flex-1 flex flex-col items-center justify-center py-1 gap-0.5 rounded-xl transition-all"
          style={{ color: isActive('/') ? '#ffffff' : 'rgba(255,255,255,0.60)' }}
        >
          <div className="relative">
            <ChatBubbleLeftIcon className={`w-6 h-6 ${isActive('/') ? 'stroke-[2.5px]' : 'stroke-[1.8px]'}`} />
            {chatUnreadCount > 0 && (
              <span className="absolute -top-1 -right-2 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-white text-[10px] font-bold shadow-sm px-1"
                style={{ color: 'var(--primary)' }}>
                {chatUnreadCount > 99 ? '99+' : chatUnreadCount}
              </span>
            )}
          </div>
          <span className="text-[10px] font-semibold tracking-wide">Chats</span>
        </Link>

        {/* Courses */}
        <Link
          href="/courses"
          className="flex-1 flex flex-col items-center justify-center py-1 gap-0.5 rounded-xl transition-all"
          style={{ color: isActive('/courses') ? '#ffffff' : 'rgba(255,255,255,0.60)' }}
        >
          <AcademicCapIcon className={`w-6 h-6 ${isActive('/courses') ? 'stroke-[2.5px]' : 'stroke-[1.8px]'}`} />
          <span className="text-[10px] font-semibold tracking-wide">Courses</span>
        </Link>

        {/* Alerts */}
        <Link
          href="/activity"
          className="flex-1 flex flex-col items-center justify-center py-1 gap-0.5 rounded-xl transition-all"
          style={{ color: isActive('/activity') ? '#ffffff' : 'rgba(255,255,255,0.60)' }}
        >
          <div className="relative">
            <BellIcon className={`w-6 h-6 ${isActive('/activity') ? 'stroke-[2.5px]' : 'stroke-[1.8px]'}`} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white animate-pulse">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </div>
          <span className="text-[10px] font-semibold tracking-wide">Alerts</span>
        </Link>

        {/* Campus */}
        <Link
          href="/campus"
          className="flex-1 flex flex-col items-center justify-center py-1 gap-0.5 rounded-xl transition-all"
          style={{ color: isActive('/campus') ? '#ffffff' : 'rgba(255,255,255,0.60)' }}
        >
          <BuildingLibraryIcon className={`w-6 h-6 ${isActive('/campus') ? 'stroke-[2.5px]' : 'stroke-[1.8px]'}`} />
          <span className="text-[10px] font-semibold tracking-wide">Campus</span>
        </Link>

        {/* Profile */}
        <Link
          href="/account"
          className="flex-1 flex flex-col items-center justify-center py-1 gap-0.5 rounded-xl transition-all"
          style={{ color: isActive('/account') ? '#ffffff' : 'rgba(255,255,255,0.60)' }}
        >
          <UserCircleIcon className={`w-6 h-6 ${isActive('/account') ? 'stroke-[2.5px]' : 'stroke-[1.8px]'}`} />
          <span className="text-[10px] font-semibold tracking-wide">Profile</span>
        </Link>
      </div>

      <NewChatModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </nav>
  );
}
