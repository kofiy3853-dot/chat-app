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
    <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-gray-100 px-4 py-2 z-50">
      <div className="flex justify-between items-center max-w-lg mx-auto h-14">
        {/* First two items */}
        {navItems.slice(0, 2).map((item) => (
          <Link 
            key={item.href}
            href={item.href}
            className={`flex-1 flex flex-col items-center justify-center h-full transition-all duration-200 ${
              isActive(item.href) 
                ? 'text-primary-600' 
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <div className="relative">
              <item.icon className={`w-6 h-6 ${isActive(item.href) ? 'stroke-[2.5px]' : 'stroke-2'}`} />
              {item.label === 'Inbox' && unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </div>
            <span className={`text-[10px] sm:text-xs font-medium mt-1 ${isActive(item.href) ? 'opacity-100' : 'opacity-70'}`}>
              {item.label}
            </span>
          </Link>
        ))}

        {/* Center Primary Action Button */}
        <div className="flex-1 flex justify-center -mt-8 px-2">
            <button 
              className="bg-primary-600 text-white rounded-2xl w-14 h-14 flex items-center justify-center shadow-[0_8px_30px_rgb(37,99,235,0.4)] hover:shadow-[0_8px_30px_rgb(37,99,235,0.6)] active:scale-95"
              onClick={() => setIsModalOpen(true)}
              aria-label="New Chat"
            >
              <PlusIcon className="w-8 h-8 stroke-2" />
            </button>
        </div>

        {/* Last two items */}
        {navItems.slice(2).map((item) => (
          <Link 
            key={item.href}
            href={item.href}
            className={`flex-1 flex flex-col items-center justify-center h-full transition-all duration-200 ${
              isActive(item.href) 
                ? 'text-primary-600' 
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <div className="relative">
              <item.icon className={`w-6 h-6 ${isActive(item.href) ? 'stroke-[2.5px]' : 'stroke-2'}`} />
              {item.label === 'Activity' && unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </div>
            <span className={`text-[10px] sm:text-xs font-medium mt-1 ${isActive(item.href) ? 'opacity-100' : 'opacity-70'}`}>
              {item.label}
            </span>
          </Link>
        ))}
      </div>
      
      <NewChatModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </nav>
  );
}
