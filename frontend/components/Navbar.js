import Link from 'next/link';
import { useRouter } from 'next/router';
import { 
  ChatBubbleLeftIcon, 
  AcademicCapIcon, 
  BellIcon, 
  UserCircleIcon,
  PlusIcon
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
    <nav className="fixed bottom-0 left-0 right-0 max-w-xl mx-auto z-40 px-4 pb-4 pt-2 pointer-events-none">
      <div className="flex justify-around items-center bg-white rounded-full border border-gray-100 shadow-lg h-16 px-2 pointer-events-auto relative">
        
        {/* Inbox Link */}
        <Link 
          href="/"
          className={`flex-1 flex flex-col items-center justify-center space-y-1 transition-all ${
            isActive('/') ? 'text-primary-600' : 'text-slate-400'
          }`}
        >
          <div className="relative">
            <ChatBubbleLeftIcon className={`w-[22px] h-[22px] ${isActive('/') ? 'stroke-[2.5px]' : 'stroke-2'}`} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </div>
          {isActive('/') && <span className="w-1 h-1 rounded-full bg-primary-600"></span>}
        </Link>

        {/* Courses Link */}
        <Link 
          href="/courses"
          className={`flex-1 flex flex-col items-center justify-center space-y-1 transition-all ${
            isActive('/courses') ? 'text-primary-600' : 'text-slate-400'
          }`}
        >
          <AcademicCapIcon className={`w-[22px] h-[22px] ${isActive('/courses') ? 'stroke-[2.5px]' : 'stroke-2'}`} />
          {isActive('/courses') && <span className="w-1 h-1 rounded-full bg-primary-600"></span>}
        </Link>

        {/* Central FAB - New Chat */}
        <div className="relative bottom-4">
           <button
             onClick={() => setIsModalOpen(true)}
             aria-label="New Chat"
             className="w-12 h-12 rounded-full flex items-center justify-center text-white shadow-md bg-primary-600 hover:bg-primary-500 active:scale-95 transition-all outline outline-4 outline-white"
             title="New Chat"
           >
             <PlusIcon className="w-6 h-6 stroke-[3px]" />
           </button>
        </div>

        {/* Activity Link */}
        <Link 
          href="/activity"
          className={`flex-1 flex flex-col items-center justify-center space-y-1 transition-all ${
            isActive('/activity') ? 'text-primary-600' : 'text-slate-400'
          }`}
        >
          <div className="relative">
            <BellIcon className={`w-[22px] h-[22px] ${isActive('/activity') ? 'stroke-[2.5px]' : 'stroke-2'}`} />
            {/* Logic for unread activity could go here */}
          </div>
          {isActive('/activity') && <span className="w-1 h-1 rounded-full bg-primary-600"></span>}
        </Link>
        
        {/* Account Link */}
        <Link 
          href="/account"
          className={`flex-1 flex flex-col items-center justify-center space-y-1 transition-all ${
            isActive('/account') ? 'text-primary-600' : 'text-slate-400'
          }`}
        >
          <UserCircleIcon className={`w-[22px] h-[22px] ${isActive('/account') ? 'stroke-[2.5px]' : 'stroke-2'}`} />
          {isActive('/account') && <span className="w-1 h-1 rounded-full bg-primary-600"></span>}
        </Link>
      </div>
      
      <NewChatModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </nav>
  );
}
