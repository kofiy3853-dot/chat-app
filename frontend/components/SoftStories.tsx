import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PlusIcon } from '@heroicons/react/24/solid';
import { getFullFileUrl, getInitials, getAvatarColor } from '../utils/helpers';
import { statusAPI as api } from '../services/api';
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
  }, []);

  const handleOpenViewer = (index: number) => {
    setSelectedGroupIndex(index);
    setViewerOpen(true);
  };

  const handleViewStatus = async (statusId: string) => {
    try {
      await api.viewStatus(statusId);
      // Update local state if needed (optional since we'll refetch/refresh next time)
    } catch (err) {
      console.error('Failed to record status view:', err);
    }
  };

  if (loading && groups.length === 0) return (
     <div className="flex space-x-4 px-1 py-1 animate-pulse">
        {[1,2,3,4].map(i => <div key={i} className="w-12 h-12 bg-gray-200 rounded-full flex-shrink-0" />)}
     </div>
  );

  return (
    <>
      <div className="flex items-center space-x-4 overflow-x-auto scrollbar-hide py-1 px-1">
        {/* My Status Item */}
        <div 
          onClick={() => setUploadOpen(true)}
          className="flex flex-col items-center flex-shrink-0 cursor-pointer w-16"
        >
          <div className="relative p-[2px] rounded-full border-2 border-dashed border-gray-300">
            <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
              {currentUser?.avatar ? (
                <img src={getFullFileUrl(currentUser.avatar)} className="w-full h-full object-cover" alt="My Status" />
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

        {/* Other Users' Statuses */}
        {groups.map((group, index) => (
          <div 
            key={group.user.id} 
            onClick={() => handleOpenViewer(index)}
            className="flex flex-col items-center flex-shrink-0 cursor-pointer w-16 group"
          >
            <div className={`relative p-[2px] rounded-full transition-all duration-300 border-2 ${group.hasUnseen ? 'border-primary-500' : 'border-gray-200'}`}>
              <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
                {group.user.avatar ? (
                  <img src={getFullFileUrl(group.user.avatar)} className="w-full h-full object-cover" alt={group.user.name} />
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

      <AnimatePresence>
        {viewerOpen && (
          <StatusViewer 
            groups={groups} 
            initialGroupIndex={selectedGroupIndex} 
            onClose={() => { setViewerOpen(false); fetchStatuses(); }} 
            onViewStatus={handleViewStatus}
          />
        )}
        {uploadOpen && (
          <UploadStatusModal 
            onClose={() => setUploadOpen(false)} 
            onSuccess={() => fetchStatuses()} 
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default React.memo(SoftStories);
