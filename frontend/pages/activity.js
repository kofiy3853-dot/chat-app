import { useEffect, useState, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { userAPI } from '../services/api';
import { 
  ChatBubbleLeftRightIcon, 
  MegaphoneIcon, 
  UserPlusIcon,
  BellIcon,
  CheckIcon,
  AtSymbolIcon,
  UserGroupIcon,
  SparklesIcon,
  ArchiveBoxIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { getSocket } from '../services/socket';
import { formatRelativeTime } from '../utils/helpers';

const TABS = [
  { id: 'ALL', label: 'All', icon: BellIcon },
  { id: 'MENTIONS', label: 'Mentions', icon: AtSymbolIcon },
  { id: 'GROUPS', label: 'Groups', icon: UserGroupIcon },
  { id: 'ANNOUNCEMENTS', label: 'Announcements', icon: MegaphoneIcon }
];

export default function Activity() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState([]);
  const [activeTab, setActiveTab] = useState('ALL');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);

  const fetchActivities = useCallback(async (pageNum = 1, shouldAppend = false) => {
    try {
      const response = await userAPI.getNotifications(pageNum);
      const newItems = response.data.notifications || [];
      
      if (shouldAppend) {
        setActivities(prev => [...prev, ...newItems]);
      } else {
        setActivities(newItems);
      }
      setHasMore(response.data.hasMore);
    } catch (error) {
      console.error('Failed to fetch activities:', error);
    } finally {
      setLoading(false);
      setIsFetchingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchActivities(1, false);

    const socket = getSocket();
    if (socket) {
      const handleNewActivity = (data) => {
        if (data.notification) {
          setActivities(prev => {
            if (prev.find(a => a.id === data.notification.id)) return prev;
            return [data.notification, ...prev];
          });
          // Vibrate on new activity
          if (navigator.vibrate) navigator.vibrate(50);
        }
      };

      socket.on('new-notification', handleNewActivity);
      return () => socket.off('new-notification', handleNewActivity);
    }
  }, [fetchActivities]);

  const loadMore = () => {
    if (hasMore && !isFetchingMore) {
      setIsFetchingMore(true);
      const nextPage = page + 1;
      setPage(nextPage);
      fetchActivities(nextPage, true);
    }
  };

  const markAllRead = async () => {
    try {
      await userAPI.markNotificationsAsRead();
      setActivities(prev => prev.map(a => ({ ...a, isRead: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const handleActivityClick = async (activity) => {
    if (!activity.isRead) {
      userAPI.markNotificationsAsRead({ notificationIds: [activity.id] }).catch(console.error);
      setActivities(prev => prev.map(a => a.id === activity.id ? { ...a, isRead: true } : a));
    }

    if (activity.actionUrl) {
      router.push(activity.actionUrl);
    } else if (activity.message?.conversationId) {
      router.push(`/chat/${activity.message.conversationId}`);
    }
  };

  const filteredActivities = activities.filter(a => {
    if (activeTab === 'ALL') return true;
    if (activeTab === 'MENTIONS') return a.type === 'MENTION';
    if (activeTab === 'GROUPS') return a.type === 'COURSE_INVITE' || a.type === 'SYSTEM' && a.title.toLowerCase().includes('group');
    if (activeTab === 'ANNOUNCEMENTS') return a.type === 'ANNOUNCEMENT';
    return true;
  });

  const getIcon = (type, title) => {
    if (type === 'MENTION') return AtSymbolIcon;
    if (type === 'ANNOUNCEMENT') return MegaphoneIcon;
    if (type === 'COURSE_INVITE') return UserPlusIcon;
    if (type === 'MESSAGE') return ChatBubbleLeftRightIcon;
    if (title?.toLowerCase().includes('group')) return UserGroupIcon;
    if (title?.toLowerCase().includes('status')) return SparklesIcon;
    return BellIcon;
  };

  const getColor = (type) => {
    switch (type) {
      case 'MENTION': return 'bg-rose-100 text-rose-600';
      case 'ANNOUNCEMENT': return 'bg-amber-100 text-amber-600';
      case 'MESSAGE': return 'bg-blue-100 text-blue-600';
      case 'SYSTEM': return 'bg-indigo-100 text-indigo-600';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  // Grouping by date
  const groupedActivities = filteredActivities.reduce((groups, activity) => {
    const date = new Date(activity.createdAt);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    let groupTitle = 'Earlier';
    if (date.toDateString() === today.toDateString()) groupTitle = 'Today';
    else if (date.toDateString() === yesterday.toDateString()) groupTitle = 'Yesterday';

    if (!groups[groupTitle]) groups[groupTitle] = [];
    groups[groupTitle].push(activity);
    return groups;
  }, {});

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin shadow-lg"></div>
          <p className="mt-4 text-slate-500 font-black uppercase tracking-widest text-[10px]">Syncing Activity...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <Head>
        <title>Activity | Campus Chat</title>
      </Head>

      {/* Header */}
      <div className="sticky top-0 bg-white/80 backdrop-blur-xl z-30 border-b border-slate-200/60 shadow-sm">
        <div className="max-w-xl mx-auto px-6 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tighter">Activity</h1>
            <div className="flex items-center space-x-1.5 mt-0.5">
              <div className="w-1.5 h-1.5 bg-primary-500 rounded-full animate-pulse"></div>
              <p className="text-[10px] font-bold text-primary-600 uppercase tracking-[0.2em]">Live Updates</p>
            </div>
          </div>
          <button 
            onClick={markAllRead}
            className="p-2.5 bg-slate-50 text-slate-500 hover:text-primary-600 hover:bg-primary-50 rounded-2xl transition-all border border-slate-100"
          >
            <CheckIcon className="w-5 h-5 stroke-[2.5px]" />
          </button>
        </div>

        {/* Tabs */}
        <div className="max-w-xl mx-auto px-4 overflow-x-auto">
          <div className="flex items-center space-x-2 pb-4 pt-1 px-2 no-scrollbar">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-2xl whitespace-nowrap transition-all text-xs font-black uppercase tracking-wider ${
                  activeTab === tab.id 
                    ? 'bg-primary-600 text-white shadow-lg shadow-primary-200' 
                    : 'bg-white text-slate-400 hover:bg-slate-50 border border-slate-100'
                }`}
              >
                <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'stroke-[2.5px]' : ''}`} />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Activity List */}
      <div className="max-w-xl mx-auto p-4 space-y-6">
        {filteredActivities.length === 0 ? (
          <div className="py-32 text-center animate-in fade-in zoom-in duration-500 overflow-hidden">
             <div className="relative inline-block">
                <div className="w-24 h-24 bg-white rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 shadow-xl shadow-slate-200/50 rotate-6 border border-slate-50">
                  <ArchiveBoxIcon className="w-10 h-10 text-slate-200" />
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center border-4 border-slate-50 animate-bounce">
                  <SparklesIcon className="w-4 h-4 text-primary-600" />
                </div>
             </div>
             <h3 className="text-xl font-black text-slate-900 tracking-tight">Nothing to show</h3>
             <p className="text-sm text-slate-400 mt-2 font-medium max-w-[240px] mx-auto leading-relaxed">
               All caught up! New activities will appear here in real-time.
             </p>
          </div>
        ) : (
          Object.entries(groupedActivities).map(([title, items]) => (
            <div key={title} className="space-y-3">
              <div className="flex items-center space-x-3 px-2">
                 <ClockIcon className="w-4 h-4 text-slate-300" />
                 <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">{title}</h4>
              </div>
              <div className="space-y-2">
                {items.map((activity) => {
                  const Icon = getIcon(activity.type, activity.title);
                  return (
                    <div
                      key={activity.id}
                      onClick={() => handleActivityClick(activity)}
                      className={`group relative p-4 bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer active:scale-[0.98] ${!activity.isRead ? 'ring-1 ring-primary-100' : ''}`}
                    >
                      {!activity.isRead && (
                        <div className="absolute right-4 top-4 w-2 h-2 bg-primary-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)] animate-pulse"></div>
                      )}
                      
                      <div className="flex items-start space-x-4">
                        <div className={`p-3 rounded-2xl shrink-0 ${getColor(activity.type)} transition-transform group-hover:scale-110 shadow-sm`}>
                          <Icon className="w-6 h-6 stroke-[2.5px]" />
                        </div>
                        <div className="flex-1 min-w-0 pr-4">
                          <h5 className={`text-sm font-black text-slate-800 leading-tight tracking-tight mb-1 truncate ${!activity.isRead ? '' : 'opacity-70'}`}>
                            {activity.title}
                          </h5>
                          <p className="text-xs text-slate-500 line-clamp-2 font-medium leading-relaxed">
                            {activity.content}
                          </p>
                          <div className="flex items-center space-x-3 mt-2.5">
                            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-100">
                              {formatRelativeTime(activity.createdAt)}
                            </span>
                            {activity.sender && (
                              <div className="flex items-center space-x-1">
                                <img src={activity.sender.avatar || '/avatars/default.png'} className="w-4 h-4 rounded-full" />
                                <span className="text-[10px] font-black text-slate-400 truncate">{activity.sender.name}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}

        {hasMore && (
          <button 
            onClick={loadMore}
            disabled={isFetchingMore}
            className="w-full py-4 text-xs font-black text-slate-400 uppercase tracking-widest hover:text-primary-600 transition-colors"
          >
            {isFetchingMore ? 'Loading...' : 'Load older activity'}
          </button>
        )}
      </div>
    </div>
  );
}
