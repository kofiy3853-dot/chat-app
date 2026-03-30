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
import { userAPI } from '../services/api';

export default function Navbar() {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // 1. Fetch initial count immediately on mount
    const fetchInitialCount = async () => {
      try {
        const response = await userAPI.getUnreadCount();
        if (response?.data?.count !== undefined) {
          setUnreadCount(response.data.count);
        }
      } catch (error) {
        console.error('Failed to fetch unread count:', error);
      }
    };
    
    if (typeof window !== 'undefined' && localStorage.getItem('token')) {
      fetchInitialCount();
    }

    // 2. Set up socket listeners
    let socket;
    const setupListeners = () => {
      socket = getSocket();
      if (socket) {
        // Re-fetch count immediately in case we missed the initial 'unread-count' event
        // (race condition: socket may have connected before Navbar mounted)
        userAPI.getUnreadCount()
          .then(r => { if (r?.data?.count !== undefined) setUnreadCount(r.data.count); })
          .catch(() => {});

        // Live updates from socket
        socket.on('new-notification', (data) => {
          setUnreadCount(data.unreadCount);
        });

        socket.on('unread-count', (data) => {
          setUnreadCount(data.count);
        });

        // If socket reconnects, re-sync the count
        socket.on('connect', () => {
          userAPI.getUnreadCount()
            .then(r => { if (r?.data?.count !== undefined) setUnreadCount(r.data.count); })
            .catch(() => {});
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
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-xl z-40 px-6 pb-6 pt-2 pointer-events-none">
      <div className="flex justify-between items-center bg-white rounded-full border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.08)] h-16 px-2 pointer-events-auto relative">
        
        {/* Inbox Link */}
        <Link 
          href="/"
          className={`flex-1 flex flex-col items-center justify-center py-2 transition-colors ${
            isActive('/') ? 'text-primary-600' : 'text-gray-400 hover:text-gray-500'
          }`}
        >
          <div className="relative">
            <ChatBubbleLeftIcon className={`w-6 h-6 ${isActive('/') ? 'stroke-[2.5px]' : 'stroke-2'}`} />
          </div>
        </Link>

        {/* Courses Link */}
        <Link 
          href="/courses"
          className={`flex-1 flex flex-col items-center justify-center py-2 transition-colors ${
            isActive('/courses') ? 'text-primary-600' : 'text-gray-400 hover:text-gray-500'
          }`}
        >
          <AcademicCapIcon className={`w-6 h-6 ${isActive('/courses') ? 'stroke-[2.5px]' : 'stroke-2'}`} />
        </Link>

        {/* Activity Link */}
        <Link 
          href="/activity"
          className={`flex-1 flex flex-col items-center justify-center py-2 transition-colors ${
            isActive('/activity') ? 'text-primary-600' : 'text-gray-400 hover:text-gray-500'
          }`}
        >
          <div className="relative">
            <BellIcon className={`w-6 h-6 ${isActive('/activity') ? 'stroke-[2.5px]' : 'stroke-2'}`} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-sm shadow-red-500/30">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </div>
        </Link>
        
        {/* Campus Link */}
        <Link 
          href="/campus"
          className={`flex-1 flex flex-col items-center justify-center py-2 transition-colors ${
            isActive('/campus') ? 'text-primary-600' : 'text-gray-400 hover:text-gray-500'
          }`}
        >
          <BuildingLibraryIcon className={`w-6 h-6 ${isActive('/campus') ? 'stroke-[2.5px]' : 'stroke-2'}`} />
        </Link>

        {/* Account Link */}
        <Link 
          href="/account"
          className={`flex-1 flex flex-col items-center justify-center py-2 transition-colors ${
            isActive('/account') ? 'text-primary-600' : 'text-gray-400 hover:text-gray-500'
          }`}
        >
          <UserCircleIcon className={`w-6 h-6 ${isActive('/account') ? 'stroke-[2.5px]' : 'stroke-2'}`} />
        </Link>
      </div>
      
      <NewChatModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </nav>
  );
}
