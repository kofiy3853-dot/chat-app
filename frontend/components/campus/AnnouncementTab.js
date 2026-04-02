import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  MegaphoneIcon, 
  PlusIcon,
  PhotoIcon,
  XMarkIcon,
  ClockIcon,
  UserIcon,
  TrashIcon,
  ShareIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { announcementAPI } from '../../services/api';
import { format } from 'date-fns';
import { getCurrentUser } from '../../utils/helpers';
import { toast } from 'react-hot-toast';

const AnnouncementTab = () => {
  const [loading, setLoading] = useState(true);
  const [announcements, setAnnouncements] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);

  useEffect(() => {
    setCurrentUser(getCurrentUser());
  }, []);

  const fetchAnnouncements = useCallback(async (pageNum = 1, shouldAppend = false) => {
    try {
      const response = await announcementAPI.getAnnouncements(pageNum);
      const newItems = response.data.announcements || [];
      
      if (shouldAppend) {
        setAnnouncements(prev => [...prev, ...newItems]);
      } else {
        setAnnouncements(newItems);
      }
      setHasMore(newItems.length === 20); // Basic pagination assumption
    } catch (error) {
      console.error('Failed to fetch announcements:', error);
    } finally {
      setLoading(false);
      setIsFetchingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchAnnouncements(1, false);
  }, [fetchAnnouncements]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    setIsSubmitting(true);
    try {
      const response = await announcementAPI.createAnnouncement({ title, content, imageUrl });
      setAnnouncements(prev => [response.data.announcement, ...prev]);
      setShowCreate(false);
      setTitle('');
      setContent('');
      setImageUrl('');
      toast.success('Announcement posted');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAnnouncement = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm('Delete this announcement?')) return;

    try {
      await announcementAPI.deleteAnnouncement(id);
      setAnnouncements(prev => prev.filter(a => a.id !== id));
      toast.success('Announcement removed');
      if (selectedAnnouncement?.id === id) setSelectedAnnouncement(null);
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  };

  const loadMore = () => {
    if (hasMore && !isFetchingMore) {
      setIsFetchingMore(true);
      const nextPage = page + 1;
      setPage(nextPage);
      fetchAnnouncements(nextPage, true);
    }
  };

  if (loading) {
    return (
      <div className="py-20 flex justify-center">
        <div className="w-10 h-10 border-4 border-slate-100 border-t-primary-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="pb-20">
      {/* Search Header */}
      <div className="bg-white/80 backdrop-blur-xl px-4 py-4 sticky top-[120px] z-10 border-b border-slate-100">
        <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Public Announcements</h2>
      </div>

      <div className="max-w-xl mx-auto p-4 space-y-6">
        {/* Create Card Inline */}
        <div className={`transition-all duration-500 overflow-hidden ${showCreate ? 'max-h-[600px] mb-8' : 'max-h-[0px]'}`}>
          <div className="bg-white rounded-[2rem] border border-slate-100 p-6 shadow-xl shadow-primary-500/5">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-800">New Announcement</h3>
              <button onClick={() => setShowCreate(false)} className="p-2 text-slate-400">
                <XMarkIcon className="w-5 h-5 stroke-[3px]" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input 
                placeholder="Subject Title"
                className="w-full text-base font-bold bg-slate-50 border-transparent focus:border-primary-200 focus:bg-white rounded-2xl p-4 outline-none transition-all"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <textarea 
                placeholder="What's happening on campus?"
                rows={4}
                className="w-full text-sm font-medium bg-slate-50 border-transparent focus:border-primary-200 focus:bg-white rounded-2xl p-4 outline-none transition-all resize-none"
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
              <div className="flex items-center space-x-2">
                 <input 
                   placeholder="Optional Image URL"
                   className="flex-1 text-xs font-bold bg-slate-50 border-transparent focus:border-primary-100 focus:bg-white rounded-xl p-3 outline-none transition-all"
                   value={imageUrl}
                   onChange={(e) => setImageUrl(e.target.value)}
                 />
                 <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400">
                   <PhotoIcon className="w-5 h-5" />
                 </div>
              </div>
              <button 
                type="submit"
                disabled={isSubmitting || !title.trim() || !content.trim()}
                className="w-full py-4 bg-primary-600 text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-lg shadow-primary-600/30 active:scale-95 disabled:opacity-30 transition-all"
              >
                {isSubmitting ? 'Posting...' : 'Post Announcement'}
              </button>
            </form>
          </div>
        </div>

        {/* Create Trigger */}
        {!showCreate && (
          <button 
            onClick={() => setShowCreate(true)}
            className="w-full flex items-center justify-between p-5 bg-white rounded-full border border-slate-100 shadow-sm hover:shadow-md transition-all active:scale-95 mb-8"
          >
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center text-primary-600">
                 <MegaphoneIcon className="w-5 h-5 stroke-[2.5px]" />
              </div>
              <span className="text-[11px] font-black uppercase tracking-widest text-slate-500">Post an announcement...</span>
            </div>
            <PlusIcon className="w-5 h-5 text-slate-300 stroke-[3px]" />
          </button>
        )}

        {announcements.length === 0 ? (
          <div className="py-20 text-center">
            <MegaphoneIcon className="w-12 h-12 text-slate-200 mx-auto mb-4" />
            <h3 className="text-base font-black text-slate-800 uppercase tracking-widest">No Alerts</h3>
            <p className="text-xs text-slate-400 font-bold mt-2">The campus is currently quiet.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {announcements.map((ann) => (
              <div 
                key={ann.id} 
                onClick={() => setSelectedAnnouncement(ann)}
                className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden shadow-slate-200/20 group cursor-pointer hover:border-primary-200 transition-all active:scale-[0.99]"
              >
                {ann.imageUrl && (
                  <div className="h-48 w-full overflow-hidden">
                    <img src={ann.imageUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt="" />
                  </div>
                )}
                <div className="p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 overflow-hidden border border-slate-100/50">
                       {ann.user?.avatar ? (
                         <img src={ann.user.avatar} className="w-full h-full object-cover" alt="" />
                       ) : (
                         <UserIcon className="w-5 h-5" />
                       )}
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-black text-slate-800">{ann.user?.name || 'Academic Board'}</p>
                      <div className="flex items-center space-x-3 mt-0.5">
                        <div className="flex items-center space-x-1.5 text-slate-400">
                           <ClockIcon className="w-3 h-3" />
                           <span className="text-[10px] font-bold">{format(new Date(ann.createdAt), 'MMM dd, p')}</span>
                        </div>
                        <span className="px-2 py-0.5 bg-primary-50 text-primary-500 rounded-md text-[8px] font-black uppercase tracking-tighter">Verified</span>
                      </div>
                    </div>
                  </div>
                  <h3 className="text-xl font-black text-slate-900 mb-2 leading-tight uppercase tracking-tight">{ann.title}</h3>
                  <p className="text-sm text-slate-600 font-medium leading-relaxed whitespace-pre-wrap line-clamp-3">{ann.content}</p>
                  
                  <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-50">
                    <div className="flex items-center space-x-2">
                       <button className="flex items-center space-x-1.5 px-4 py-2 hover:bg-slate-50 rounded-xl text-slate-400 transition-colors">
                          <ShareIcon className="w-4 h-4" />
                          <span className="text-[10px] font-black uppercase tracking-widest">Share</span>
                       </button>
                    </div>
                    {(currentUser?.id === ann.userId || currentUser?.role === 'ADMIN') && (
                      <button 
                         onClick={(e) => handleDeleteAnnouncement(e, ann.id)}
                         className="p-2.5 bg-white text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-100"
                      >
                         <TrashIcon className="w-4.5 h-4.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {hasMore && (
              <button onClick={loadMore} className="w-full py-6 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">
                {isFetchingMore ? 'Unfolding more content...' : 'Load Older Posts'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Full Detail Modal */}
      {selectedAnnouncement && (
         <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
            {/* Backdrop */}
            <div 
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" 
              onClick={() => setSelectedAnnouncement(null)}
            />
            
            {/* Modal Content */}
            <div className="relative w-full max-w-xl bg-white rounded-t-[3rem] sm:rounded-[3rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 duration-300 flex flex-col max-h-[90vh]">
               {selectedAnnouncement.imageUrl ? (
                  <div className="h-64 bg-slate-200 relative shrink-0">
                     <img src={selectedAnnouncement.imageUrl} className="w-full h-full object-cover" alt="" />
                     <button 
                       onClick={() => setSelectedAnnouncement(null)}
                       className="absolute top-6 right-6 p-2 bg-black/40 backdrop-blur-md text-white rounded-2xl hover:bg-black/60 transition-all shadow-xl"
                     >
                        <XMarkIcon className="w-6 h-6 stroke-[2.5px]" />
                     </button>
                  </div>
               ) : (
                  <div className="p-8 pb-0 flex justify-between items-start shrink-0">
                     <div className="w-12 h-12 bg-primary-50 rounded-2xl flex items-center justify-center text-primary-600">
                        <MegaphoneIcon className="w-6 h-6 stroke-[2.5px]" />
                     </div>
                     <button 
                       onClick={() => setSelectedAnnouncement(null)}
                       className="p-2.5 bg-slate-50 text-slate-400 rounded-2xl hover:bg-slate-100 transition-all"
                     >
                        <XMarkIcon className="w-6 h-6 stroke-[2.5px]" />
                     </button>
                  </div>
               )}

               <div className="flex-1 overflow-y-auto px-8 py-10 custom-scrollbar">
                  <div className="flex items-center space-x-3 mb-6">
                     <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 overflow-hidden border border-slate-100">
                        {selectedAnnouncement.user?.avatar ? (
                          <img src={selectedAnnouncement.user.avatar} className="w-full h-full object-cover" alt="" />
                        ) : (
                          <UserIcon className="w-6 h-6" />
                        )}
                     </div>
                     <div>
                        <p className="text-sm font-black text-slate-800">{selectedAnnouncement.user?.name || 'Board Member'}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1">
                           Posted {format(new Date(selectedAnnouncement.createdAt), 'MMMM d, yyyy')}
                        </p>
                     </div>
                  </div>

                  <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight leading-[1.1] mb-6">
                     {selectedAnnouncement.title}
                  </h2>

                  <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 mb-8">
                     <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-4 flex items-center space-x-2">
                        <InformationCircleIcon className="w-4 h-4" />
                        <span>Official Message</span>
                     </h3>
                     <p className="text-base text-slate-700 font-medium leading-relaxed whitespace-pre-wrap">
                        {selectedAnnouncement.content}
                     </p>
                  </div>

                  <div className="flex items-center space-x-4">
                     <button className="flex-1 py-4 bg-primary-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-primary-600/20 active:scale-[0.98] transition-all">
                        Spread the word
                     </button>
                     {(currentUser?.id === selectedAnnouncement.userId || currentUser?.role === 'ADMIN') && (
                       <button 
                         onClick={(e) => handleDeleteAnnouncement(e, selectedAnnouncement.id)}
                         className="p-4 bg-red-50 text-red-500 rounded-2xl hover:bg-red-100 transition-all active:scale-[0.98] border border-red-100"
                        >
                          <TrashIcon className="w-6 h-6" />
                       </button>
                     )}
                  </div>
               </div>
            </div>
         </div>
      )}
    </div>
  );
};

export default AnnouncementTab;
