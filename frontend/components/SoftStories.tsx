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
        {[1,2,3,4].map(i => <div key={i} className="w-12 h-12 bg-white/20 rounded-[20px] flex-shrink-0" />)}
     </div>
  );

  return (
    <>
      <div className="flex items-center space-x-4 overflow-x-auto scrollbar-hide py-1 px-1">
        {/* My Status Item */}
        <div 
          onClick={() => setUploadOpen(true)}
          className="flex flex-col items-center space-y-1.5 flex-shrink-0 cursor-pointer"
        >
          <div className="relative p-[3px] rounded-[22px] border-2 border-dashed border-white/30">
            <div className="w-12 h-12 rounded-[18px] bg-white/20 backdrop-blur-md overflow-hidden border border-white/20 p-0.5 shadow-lg">
              {currentUser?.avatar ? (
                <img src={getFullFileUrl(currentUser.avatar)} className="w-full h-full object-cover rounded-2xl" alt="" />
              ) : (
                <div className="w-full h-full bg-white/20 flex items-center justify-center text-white text-xs font-black rounded-2xl">
                  {getInitials(currentUser?.name)}
                </div>
              )}
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-xl bg-white flex items-center justify-center text-primary-500 shadow-xl border-2 border-primary-500 transform transition-transform hover:rotate-90">
              <PlusIcon className="w-4 h-4 stroke-[3px]" />
            </div>
          </div>
          <p className="text-[10px] font-black text-white/90 tracking-tight uppercase leading-none mt-1">Status</p>
        </div>

        {/* Other Users' Statuses */}
        {groups.map((group, index) => (
          <div 
            key={group.user.id} 
            onClick={() => handleOpenViewer(index)}
            className="flex flex-col items-center space-y-1.5 flex-shrink-0 cursor-pointer group"
          >
            <div className={`relative p-[3px] rounded-[22px] border-2 transition-all duration-500 ${group.hasUnseen ? 'border-sky-400 rotate-12 scale-105 shadow-[0_0_15px_rgba(56,189,248,0.4)]' : 'border-white/20 opacity-80'}`}>
              <div className="w-12 h-12 rounded-[18px] bg-white/20 backdrop-blur-md overflow-hidden p-0.5">
                {group.user.avatar ? (
                  <img src={getFullFileUrl(group.user.avatar)} className="w-full h-full object-cover rounded-2xl" alt="" />
                ) : (
                  <div className={`w-full h-full rounded-2xl bg-gradient-to-tr ${getAvatarColor(group.user.name)} flex items-center justify-center text-white text-xs font-black`}>
                    {getInitials(group.user.name)}
                  </div>
                )}
              </div>
            </div>
            <p className="text-[10px] font-black text-white/80 truncate w-14 text-center tracking-tight leading-none uppercase">
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
