import React, { useState, useEffect } from 'react';
import { PlusIcon } from '@heroicons/react/24/solid';
import { toast } from 'react-hot-toast';
import { getFullFileUrl, getInitials, getAvatarColor } from '../utils/helpers';
import { getSocket } from '../services/socket';
import { statusAPI as api, chatAPI } from '../services/api';
import StatusViewer from './StatusViewer';
import UploadStatusModal from './UploadStatusModal';

interface Status {
  id: string;
  type: 'TEXT' | 'IMAGE' | 'VIDEO';
  contentUrl?: string;
  textContent?: string;
  backgroundColor?: string;
  caption?: string;
  createdAt: string;
  viewCount?: number;
}

interface UserGroupedStatus {
  user: {
    id: string;
    name: string;
    avatar?: string;
  };
  statuses: Status[];
  hasUnseen: boolean;
}

interface SoftStoriesProps {
  currentUser: any;
}

const SoftStories: React.FC<SoftStoriesProps> = ({ currentUser }) => {
  const [groups, setGroups] = useState<UserGroupedStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedGroupIndex, setSelectedGroupIndex] = useState(0);

  const fetchStatuses = async () => {
    try {
      const res = await api.getStatuses();
      setGroups(res.data);
    } catch (err) {
      console.error('Failed to fetch statuses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatuses();

    const socket = getSocket();
    if (socket) {
      const handleStatusViewUpdate = (data: any) => {
        setGroups(prev => prev.map(group => ({
          ...group,
          statuses: group.statuses.map(s => s.id === data.statusId ? { ...s, viewCount: data.viewCount } : s)
        })));
      };

      socket.on('status-viewed-update', handleStatusViewUpdate);
      return () => {
        socket.off('status-viewed-update', handleStatusViewUpdate);
      };
    }
  }, []);

  const handleOpenViewer = (index: number) => {
    setSelectedGroupIndex(index);
    setViewerOpen(true);
  };

  const handleViewStatus = async (statusId: string) => {
    try {
      await api.viewStatus(statusId);
    } catch (err) {
      console.error('Failed to record status view:', err);
    }
  };

  const handleDeleteStatus = async (statusId: string) => {
    try {
      await api.deleteStatus(statusId);
      toast.success('Status deleted');
      
      const updatedGroups = groups.map(group => ({
        ...group,
        statuses: group.statuses.filter(s => s.id !== statusId)
      })).filter(group => group.statuses.length > 0);
      
      setGroups(updatedGroups);
      
      if (updatedGroups.length === 0 || !updatedGroups[selectedGroupIndex]) {
        setViewerOpen(false);
      }
    } catch (err) {
      console.error('Failed to delete status:', err);
      toast.error('Failed to delete status');
    }
  };

  const handleReplyStatus = async (status: Status, message: string, userId: string) => {
    try {
      const convRes = await chatAPI.getOrCreateDirectConversation(userId);
      const conversationId = convRes.data.id;

      const statusRef = status.type === 'TEXT' 
        ? `"${status.textContent}"` 
        : (status.caption || 'Image/Video status');
      
      const content = `Replied to your status: ${statusRef}\n\n${message}`;

      await chatAPI.sendMessage({
        conversationId,
        content,
        type: 'TEXT'
      });
    } catch (err) {
      console.error('Failed to reply to status:', err);
      throw err;
    }
  };

  if (loading && groups.length === 0) return (
     <div className="flex space-x-4 px-1 py-1">
        {[1,2,3,4].map(i => <div key={i} className="w-12 h-12 bg-gray-200 rounded-full flex-shrink-0" />)}
     </div>
  );

  return (
    <>
      <div className="flex items-center space-x-4 overflow-x-auto scrollbar-hide py-1 px-1">
        <div 
          onClick={() => setUploadOpen(true)}
          role="button"
          aria-label="Add new status"
          title="Add status"
          className="flex flex-col items-center flex-shrink-0 cursor-pointer w-16 outline-none focus:ring-2 focus:ring-primary-500 rounded-lg p-1"
        >
          <div className="relative p-[2px] rounded-full border-2 border-dashed border-app-light">
              <div className="w-12 h-12 rounded-full overflow-hidden bg-surface-2 flex items-center justify-center">
                {currentUser?.avatar ? (
                  <img src={getFullFileUrl(currentUser.avatar)} loading="lazy" decoding="async" className="w-full h-full object-cover" alt="My Status" />
                ) : (
                  <span className="text-gray-600 text-sm font-bold">{getInitials(currentUser?.name)}</span>
                )}
              </div>
              <div className="absolute bottom-0 right-0 w-5 h-5 bg-primary-500 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                <PlusIcon className="w-3 h-3 text-white" />
              </div>
            </div>
            <p className="text-xs font-medium text-gray-700 mt-1 truncate w-full text-center">My Status</p>
          </div>
  
          {groups.map((group, index) => (
            <div 
              key={group.user.id} 
              onClick={() => handleOpenViewer(index)}
              role="button"
              aria-label={`View status from ${group.user.name}`}
              title={`View status from ${group.user.name}`}
              className="flex flex-col items-center flex-shrink-0 cursor-pointer w-16 group outline-none focus:ring-2 focus:ring-primary-500 rounded-lg p-1"
            >
              <div className={`relative p-[2px] rounded-full   border-2 ${group.hasUnseen ? 'border-primary-500' : 'border-app-light'}`}>
                <div className="w-12 h-12 rounded-full overflow-hidden bg-surface-2 flex items-center justify-center">
                  {group.user.avatar ? (
                    <img src={getFullFileUrl(group.user.avatar)} loading="lazy" decoding="async" className="w-full h-full object-cover" alt={group.user.name} />
                  ) : (
                    <div className={`w-full h-full flex items-center justify-center text-white text-sm font-bold bg-gradient-to-tr ${getAvatarColor(group.user.name)}`}>
                      {getInitials(group.user.name)}
                    </div>
                  )}
                </div>
              </div>
            <p className={`text-xs mt-1 truncate w-full text-center ${group.hasUnseen ? 'font-semibold text-gray-900' : 'font-medium text-gray-500'}`}>
              {group.user.name.split(' ')[0]}
            </p>
          </div>
        ))}
      </div>

      {viewerOpen && (
          <StatusViewer 
            groups={groups} 
            initialGroupIndex={selectedGroupIndex} 
            onClose={() => { setViewerOpen(false); fetchStatuses(); }} 
            onViewStatus={handleViewStatus}
            onDeleteStatus={handleDeleteStatus}
            onReply={handleReplyStatus}
          />
        )}
        {uploadOpen && (
          <UploadStatusModal 
            onClose={() => setUploadOpen(false)} 
            onSuccess={() => fetchStatuses()} 
          />
        )}
    </>
  );
};

export default React.memo(SoftStories);
