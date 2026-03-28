import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { formatDistanceToNow } from 'date-fns';
import { userAPI, authAPI } from '../services/api';
import { 
  ChatBubbleLeftIcon, 
  MegaphoneIcon, 
  UserPlusIcon,
  BellIcon,
  CheckIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';
import { getSocket } from '../services/socket';

export default function Activity() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [markingRead, setMarkingRead] = useState(false);

  useEffect(() => {
    fetchNotifications();

    const socket = getSocket();
    if (socket) {
      const handleNewNotification = (data) => {
        if (data.notification) {
          setNotifications(prev => {
            // Check for duplicates
            if (prev.find(n => n.id === data.notification.id)) return prev;
            return [data.notification, ...prev];
          });
        }
      };

      const handleMessagesRead = (data) => {
        // Find notifications for this conversation and mark them as read locally
        setNotifications(prev => prev.map(n => 
          (n.type === 'MESSAGE' && n.message?.conversationId === data.conversationId)
            ? { ...n, isRead: true } 
            : n
        ));
      };

      socket.on('new-notification', handleNewNotification);
      socket.on('messages-read', handleMessagesRead);

      return () => {
        socket.off('new-notification', handleNewNotification);
        socket.off('messages-read', handleMessagesRead);
      };
    }
  }, []);

  const fetchNotifications = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const response = await userAPI.getNotifications();
      setNotifications(response.data.notifications || []);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        router.push('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const markAllAsRead = async () => {
    if (markingRead || notifications.length === 0) return;
    setMarkingRead(true);
    try {
      await userAPI.markNotificationsAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (error) {
      console.error('Failed to mark notifications as read:', error);
    } finally {
      setMarkingRead(false);
    }
  };

  const handleNotificationClick = async (notification) => {
    // Navigate based on type
    if (notification.type === 'MESSAGE' && notification.message?.conversationId) {
      router.push(`/chat/${notification.message.conversationId}`);
    } else if (notification.actionUrl) {
      router.push(notification.actionUrl);
    }

    // Mark as read if it's not
    if (!notification.isRead) {
      try {
        await userAPI.markNotificationsAsRead({ notificationIds: [notification.id] });
        setNotifications(prev => prev.map(n => 
          n.id === notification.id ? { ...n, isRead: true } : n
        ));
      } catch (err) {
        console.error('Failed to mark as read:', err);
      }
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'MESSAGE':
        return ChatBubbleLeftIcon;
      case 'ANNOUNCEMENT':
        return MegaphoneIcon;
      case 'COURSE_INVITE':
        return UserPlusIcon;
      default:
        return BellIcon;
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'MESSAGE':
        return 'bg-blue-100 text-blue-600';
      case 'ANNOUNCEMENT':
        return 'bg-purple-100 text-purple-600';
      case 'COURSE_INVITE':
        return 'bg-green-100 text-green-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 border-4 border-primary-100 border-t-primary-600 rounded-full animate-spin"></div>
          <p className="mt-4 text-slate-500 font-medium">Checking updates...</p>
        </div>
      </div>
    );
  }

  const [search, setSearch] = useState('');

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const filteredNotifications = notifications.filter(n => {
    if (!search) return true;
    const lowerSearch = search.toLowerCase();
    return (n.title && n.title.toLowerCase().includes(lowerSearch)) || 
           (n.content && n.content.toLowerCase().includes(lowerSearch));
  });

  return (
    <>
      <Head>
        <title>Activity | Campus Chat</title>
      </Head>
      
      <div className="max-w-xl mx-auto min-h-screen bg-white shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex flex-col sticky top-0 bg-white/90 backdrop-blur-md border-b border-slate-100 z-10 px-6 py-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Activity</h1>
              <p className="text-[10px] font-bold text-primary-600 uppercase tracking-widest mt-0.5">
                {unreadCount > 0 ? `${unreadCount} New notifications` : 'No new updates'}
              </p>
            </div>
            {unreadCount > 0 && (
              <button 
                onClick={markAllAsRead}
                disabled={markingRead}
                className="p-2 text-primary-600 hover:bg-primary-50 rounded-xl transition-all flex items-center space-x-1"
              >
                <CheckIcon className="w-5 h-5 stroke-[2.5px]" />
                <span className="text-xs font-extrabold uppercase tracking-wider">Mark Read</span>
              </button>
            )}
          </div>
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search notifications..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-gray-50 border-none rounded-xl py-2 pl-10 pr-4 text-sm font-medium focus:ring-2 focus:ring-blue-100 transition-all outline-none"
            />
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto pb-24">
          {filteredNotifications.length === 0 ? (
            <div className="px-12 py-32 text-center">
              <div className="w-24 h-24 bg-slate-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6 rotate-12 transition-transform hover:rotate-0 duration-500">
                <BellIcon className="w-12 h-12 text-slate-300" />
              </div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">Quiet day...</h3>
              <p className="text-sm text-slate-500 mt-2 font-medium">No notifications yet. Check back later for updates from your classmates!</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {notifications.map((notification, idx) => {
                const Icon = getNotificationIcon(notification.type);
                return (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`group p-6 cursor-pointer transition-all duration-300 relative ${
                      !notification.isRead 
                        ? 'bg-blue-50/30 hover:bg-blue-50/50' 
                        : 'hover:bg-slate-50/80'
                    }`}
                  >
                    {!notification.isRead && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary-600"></div>
                    )}
                    
                    <div className="flex items-start space-x-4">
                      <div className={`p-3 rounded-2xl shadow-sm transition-transform group-hover:scale-110 ${getNotificationColor(notification.type)}`}>
                        <Icon className="w-6 h-6 stroke-2" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <h3 className={`text-sm sm:text-base font-bold text-slate-900 leading-tight ${!notification.isRead ? '' : 'opacity-70'}`}>
                            {notification.title}
                          </h3>
                        </div>
                        {notification.content && (
                          <p className="text-sm text-slate-500 mt-1 line-clamp-2 leading-relaxed font-medium">
                            {notification.content}
                          </p>
                        )}
                        <div className="flex items-center space-x-2 mt-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                          </span>
                          {!notification.isRead && (
                            <span className="w-1.5 h-1.5 bg-primary-600 rounded-full animate-pulse"></span>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
