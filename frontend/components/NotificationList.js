import { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { 
  ChatBubbleLeftIcon, 
  MegaphoneIcon, 
  UserPlusIcon,
  BellIcon,
  CheckIcon,
  PhoneIcon
} from '@heroicons/react/24/outline';

export default function NotificationList({ notifications = [], onMarkAsRead }) {
  const getNotificationIcon = (type) => {
    const normalizedType = type?.toLowerCase();
    switch (normalizedType) {
      case 'message':
        return ChatBubbleLeftIcon;
      case 'announcement':
        return MegaphoneIcon;
      case 'course_invite':
        return UserPlusIcon;
      case 'system':
        return PhoneIcon;
      default:
        return BellIcon;
    }
  };

  const getNotificationColor = (type) => {
    const normalizedType = type?.toLowerCase();
    switch (normalizedType) {
      case 'message':
        return 'bg-blue-100 text-blue-600';
      case 'announcement':
        return 'bg-purple-100 text-purple-600';
      case 'course_invite':
        return 'bg-green-100 text-green-600';
      case 'system':
        return 'bg-rose-100 text-rose-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const getNotificationTitle = (notification) => {
    const normalizedType = notification.type?.toLowerCase();
    switch (normalizedType) {
      case 'message':
        return `New message from ${notification.sender?.name || 'someone'}`;
      case 'announcement':
        return `Announcement in ${notification.course?.code || 'course'}`;
      case 'course_invite':
        return 'Course invitation';
      case 'system':
        return notification.title;
      default:
        return notification.title;
    }
  };

  if (notifications.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        <BellIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
        <p>No notifications yet</p>
        <p className="text-sm mt-2">Check back later for updates</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100">
      {notifications.map((notification) => {
        const Icon = getNotificationIcon(notification.type);
        return (
          <div
            key={notification._id}
            className={`p-4 hover:bg-gray-50  ${
              !notification.isRead ? 'bg-blue-50' : ''
            }`}
          >
            <div className="flex items-start space-x-3">
              <div className={`p-2 rounded-full ${getNotificationColor(notification.type)}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <h3 className="font-medium text-gray-900">
                    {getNotificationTitle(notification)}
                  </h3>
                  {!notification.isRead && (
                    <button
                      onClick={() => onMarkAsRead?.(notification._id)}
                      className="p-1 text-gray-400 hover:text-blue-600"
                      title="Mark as read"
                    >
                      <CheckIcon className="w-4 h-4" />
                    </button>
                  )}
                </div>
                {notification.content && (
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                    {notification.content}
                  </p>
                )}
                <p className="text-xs text-gray-400 mt-2">
                  {notification.createdAt && !isNaN(new Date(notification.createdAt).getTime())
                    ? formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })
                    : ''}
                </p>
              </div>
              {!notification.isRead && (
                <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
