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
import { formatRelativeTime, getInitials, getAvatarColor, getFullFileUrl } from '../utils/helpers';

const TABS = [
  { id: 'ALL', label: 'All', icon: BellIcon },
  { id: 'MENTIONS', label: 'Mentions', icon: AtSymbolIcon },
  { id: 'SYSTEM', label: 'System', icon: SparklesIcon },
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
  const [dismissingIds, setDismissingIds] = useState(new Set());

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
      const { toast } = require('react-hot-toast');
      toast.error('Failed to sync activity updates');
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
      // Dismiss all — fade out then clear
      const allIds = new Set(activities.map(a => a.id));
      setDismissingIds(allIds);
      setTimeout(() => {
        setActivities([]);
        setDismissingIds(new Set());
      }, 400);
    } catch (err) {
      console.error(err);
    }
  };

  const handleActivityClick = async (activity) => {
    if (!activity.isRead) {
      userAPI.markNotificationsAsRead({ notificationIds: [activity.id] }).catch(console.error);
      // Fade out then remove
      setDismissingIds(prev => new Set([...prev, activity.id]));
      setTimeout(() => {
        setActivities(prev => prev.filter(a => a.id !== activity.id));
        setDismissingIds(prev => { const s = new Set(prev); s.delete(activity.id); return s; });
      }, 350);
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
    if (activeTab === 'SYSTEM') return a.type === 'SYSTEM';
    if (activeTab === 'GROUPS') return a.type === 'COURSE_INVITE' || (a.type === 'SYSTEM' && (a.title.toLowerCase().includes('group') || a.title.toLowerCase().includes('course')));
    if (activeTab === 'ANNOUNCEMENTS') return a.type === 'ANNOUNCEMENT';
    return true;
  });

  const getIcon = (type, title) => {
    if (type === 'MENTION') return AtSymbolIcon;
    if (type === 'ANNOUNCEMENT') return MegaphoneIcon;
    if (type === 'COURSE_INVITE') return UserPlusIcon;
    if (type === 'MESSAGE') return ChatBubbleLeftRightIcon;
    if (type === 'SYSTEM') return SparklesIcon;
    if (title?.toLowerCase().includes('group')) return UserGroupIcon;
    if (title?.toLowerCase().includes('status')) return SparklesIcon;
    return BellIcon;
  };

  const getColor = (type) => {
    switch (type) {
      case 'MENTION': return 'bg-rose-100 text-rose-600';
      case 'ANNOUNCEMENT': return 'bg-amber-100 text-amber-600';
      case 'MESSAGE': return 'bg-blue-100 text-blue-600';
      case 'SYSTEM': return 'bg-primary-100 text-primary-600';
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
    <div className="min-h-screen pb-24 pt-20" style={{ backgroundColor: 'var(--bg-page)' }}>
      <Head>
        <title>Activity | Campus Chat</title>
      </Head>

      {/* Header - Fixed Unified Theme */}
      <header 
        className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-xl z-[100] px-4 pt-[max(env(safe-area-inset-top,0px),16px)] pb-3 border-b transition-all"
        style={{ background: 'var(--bg-navbar)', color: 'var(--text-navbar)', borderColor: 'var(--border)' }}
      >
        <div className="flex items-center justify-between mb-3 px-2">
          <div>
            <h1 className="text-xl font-black tracking-tight leading-tight" style={{ color: 'var(--text-navbar)' }}>Activity</h1>
            <div className="flex items-center space-x-1.5 mt-0.5">
              <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: 'color-mix(in srgb, var(--text-navbar), transparent 30%)' }}>Live Updates</p>
            </div>
          </div>
          <button 
            onClick={markAllRead}
            className="w-9 h-9 flex items-center justify-center rounded-full transition-all"
            style={{ backgroundColor: 'rgba(0,0,0,0.05)', color: 'var(--text-navbar)' }}
          >
            <CheckIcon className="w-4 h-4 stroke-[3px]" />
          </button>
        </div>

        <div className="overflow-x-auto no-scrollbar pt-1">
          <div className="flex items-center space-x-2 pb-1 px-2">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex items-center space-x-2 px-4 py-2 rounded-xl whitespace-nowrap transition-all text-[10px] font-black uppercase tracking-wider"
                style={{ 
                  backgroundColor: activeTab === tab.id ? 'var(--bg-page)' : 'rgba(0,0,0,0.05)', 
                  color: activeTab === tab.id ? 'var(--primary)' : 'color-mix(in srgb, var(--text-navbar), transparent 30%)'
                }}
              >
                <tab.icon className={`w-3.5 h-3.5 ${activeTab === tab.id ? 'stroke-[2.5px]' : ''}`} />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </header>

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
                      className={`group relative p-4 bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer active:scale-[0.98] ${!activity.isRead ? 'ring-1 ring-primary-100' : ''} ${
                        dismissingIds.has(activity.id) ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100'
                      }`}
                      style={{ transition: 'opacity 0.35s ease, transform 0.35s ease' }}
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
                                {activity.sender.avatar ? (
                                  <img src={getFullFileUrl(activity.sender.avatar)} className="w-4 h-4 rounded-full object-cover" />
                                ) : (
                                  <div className={`w-4 h-4 rounded-full flex items-center justify-center bg-gradient-to-br ${getAvatarColor(activity.sender.name)}`}>
                                    <span className="text-[8px] font-bold text-white leading-none">
                                      {getInitials(activity.sender.name)}
                                    </span>
                                  </div>
                                )}
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
