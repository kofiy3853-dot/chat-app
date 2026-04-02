import React, { useState, useEffect, useCallback } from 'react';
import { 
  UserCircleIcon, 
  HashtagIcon,
  PlusIcon,
  ShieldCheckIcon,
  PaperAirplaneIcon,
  XMarkIcon,
  TrashIcon,
  ChatBubbleBottomCenterTextIcon,
  ClockIcon,
  InformationCircleIcon,
  TagIcon
} from '@heroicons/react/24/outline';
import { anonymousAPI } from '../../services/api';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';

const AnonymousTab = () => {
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState([]);
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);

  const fetchPosts = useCallback(async (pageNum = 1, shouldAppend = false) => {
    try {
      const response = await anonymousAPI.getPosts(pageNum);
      const newItems = response.data.posts || [];
      
      if (shouldAppend) {
        setPosts(prev => [...prev, ...newItems]);
      } else {
        setPosts(newItems);
      }
      setHasMore(newItems.length === 20);
    } catch (error) {
      console.error('Failed to fetch anonymous posts:', error);
    } finally {
      setLoading(false);
      setIsFetchingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts(1, false);
  }, [fetchPosts]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    setIsSubmitting(true);
    try {
      const response = await anonymousAPI.createPost({ content, tags });
      // The newly created post is yours, manual mark as owner for immediate UI
      const newPost = { ...response.data.post, isOwner: true };
      setPosts(prev => [newPost, ...prev]);
      setContent('');
      setTags('');
      toast.success('Whisper shared');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePost = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm('Delete this whisper forever?')) return;
    try {
      await anonymousAPI.deletePost(id);
      setPosts(prev => prev.filter(p => p.id !== id));
      toast.success('Whisper deleted');
      if (selectedPost?.id === id) setSelectedPost(null);
    } catch (err) {
      console.error('Failed to delete whisper:', err);
    }
  };

  const loadMore = () => {
    if (hasMore && !isFetchingMore) {
      setIsFetchingMore(true);
      const nextPage = page + 1;
      setPage(nextPage);
      fetchPosts(nextPage, true);
    }
  };

  if (loading) {
    return (
      <div className="py-20 flex justify-center">
        <div className="w-10 h-10 border-4 border-slate-100 border-t-emerald-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="pb-32 px-4 pt-6 space-y-8 max-w-xl mx-auto">
      {/* Privacy Notice */}
      <div className="bg-emerald-50/50 border border-emerald-100 rounded-3xl p-4 flex items-center space-x-3">
         <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
            <ShieldCheckIcon className="w-5 h-5" />
         </div>
         <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Safe Space</p>
            <p className="text-[10px] font-bold text-emerald-600/70 italic">Your identity is completely hidden. Speak your mind freely.</p>
         </div>
      </div>

      {/* Input Overlay */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 p-6 shadow-xl shadow-slate-200/20">
         <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-start space-x-4">
               <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-300">
                  <UserCircleIcon className="w-8 h-8" />
               </div>
               <div className="flex-1">
                  <textarea 
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Write something anonymously..."
                    rows={3}
                    className="w-full bg-transparent border-none p-0 text-sm font-medium focus:ring-0 resize-none placeholder-slate-300"
                  />
                  <div className="mt-4 flex items-center space-x-2">
                     <HashtagIcon className="w-3.5 h-3.5 text-slate-400" />
                     <input 
                        value={tags}
                        onChange={(e) => setTags(e.target.value)}
                        placeholder="Tags (e.g. #confession, #feedback)"
                        className="flex-1 bg-transparent border-none p-0 text-[11px] font-black uppercase tracking-widest placeholder-slate-300 focus:ring-0"
                     />
                  </div>
               </div>
            </div>
            <div className="flex justify-end pt-2 border-t border-slate-50">
               <button 
                  disabled={!content.trim() || isSubmitting}
                  className="px-6 py-2.5 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-600/20 active:scale-95 disabled:opacity-30 transition-all flex items-center space-x-2"
               >
                  <span>Whisper Post</span>
                  <PaperAirplaneIcon className="w-3.5 h-3.5 -rotate-45" />
               </button>
            </div>
         </form>
      </div>

      {/* Posts List */}
      <div className="space-y-6">
        {posts.length === 0 ? (
          <div className="py-20 text-center opacity-30">
            <HashtagIcon className="w-12 h-12 mx-auto mb-4" />
            <p className="text-xs font-black uppercase tracking-widest">Quiet Whispers</p>
          </div>
        ) : (
          posts.map((post) => (
            <div 
              key={post.id} 
              onClick={() => setSelectedPost(post)}
              className="bg-white rounded-[2rem] border border-slate-100 p-6 shadow-sm shadow-slate-200/10 hover:border-emerald-200 transition-all cursor-pointer active:scale-[0.99] group"
            >
               <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2.5">
                     <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-200 border border-slate-100/50">
                        <UserCircleIcon className="w-6 h-6" />
                     </div>
                     <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter italic">Anonymous User</span>
                  </div>
                  <div className="flex items-center space-x-3">
                     <span className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em]">{format(new Date(post.createdAt), 'p')}</span>
                     {post.isOwner && (
                        <button 
                          onClick={(e) => handleDeletePost(e, post.id)}
                          className="p-1.5 text-slate-200 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        >
                           <TrashIcon className="w-3.5 h-3.5" />
                        </button>
                     )}
                  </div>
               </div>
               <p className="text-sm font-medium text-slate-700 leading-relaxed break-words line-clamp-4 italic">"{post.content}"</p>
               {post.tags && (
                 <div className="mt-4 flex flex-wrap gap-2">
                    {post.tags.split(',').map((tag, i) => (
                       <span key={i} className="px-2 py-0.5 bg-slate-50 text-slate-400 rounded-md text-[9px] font-black uppercase tracking-tighter">
                          {tag.trim().startsWith('#') ? tag.trim() : `#${tag.trim()}`}
                       </span>
                    ))}
                 </div>
               )}
            </div>
          ))
        )}
        {hasMore && (
          <button onClick={loadMore} className="w-full py-6 text-[9px] font-black text-slate-300 uppercase tracking-[0.3em] text-center">
            {isFetchingMore ? 'Unveiling more whispers...' : 'Past Messages'}
          </button>
        )}
      </div>

      {/* Whisper Detail Modal */}
      {selectedPost && (
         <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setSelectedPost(null)} />
            
            <div className="relative w-full max-w-xl bg-slate-900 rounded-t-[3rem] sm:rounded-[3rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 duration-300 flex flex-col max-h-[90vh]">
               <div className="p-8 pb-4 flex justify-between items-start shrink-0">
                  <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-emerald-400">
                      <ChatBubbleBottomCenterTextIcon className="w-6 h-6 stroke-[2.5px]" />
                  </div>
                  <button 
                    onClick={() => setSelectedPost(null)}
                    className="p-2.5 bg-white/10 text-white/50 rounded-2xl hover:bg-white/20 transition-all"
                  >
                     <XMarkIcon className="w-6 h-6 stroke-[2.5px]" />
                  </button>
               </div>

               <div className="flex-1 overflow-y-auto px-8 py-10 custom-scrollbar">
                  <div className="flex items-center space-x-3 mb-8">
                     <span className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em]">Confidential Whisper</span>
                     <div className="h-px flex-1 bg-white/10" />
                  </div>

                  <div className="p-8 bg-white/5 rounded-[2.5rem] border border-white/10 mb-8 shadow-inner shadow-black/20">
                     <p className="text-xl text-white font-medium leading-relaxed italic tracking-wide">
                        "{selectedPost.content}"
                     </p>
                  </div>

                  <div className="flex flex-wrap gap-3 mb-10">
                     {selectedPost.tags?.split(',').map((tag, i) => (
                        <div key={i} className="flex items-center space-x-2 px-4 py-2 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black text-white/50 uppercase tracking-widest">
                           <TagIcon className="w-3.5 h-3.5" />
                           <span>{tag.trim().startsWith('#') ? tag.trim() : `#${tag.trim()}`}</span>
                        </div>
                     ))}
                  </div>

                  <div className="flex items-center justify-between p-6 bg-white/5 rounded-3xl border border-white/10 mt-auto">
                     <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400">
                           <ClockIcon className="w-5 h-5" />
                        </div>
                        <div>
                           <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-0.5">Shared On</p>
                           <p className="text-xs font-bold text-white/70">{format(new Date(selectedPost.createdAt), 'MMMM do, yyyy @ p')}</p>
                        </div>
                     </div>

                     <div className="flex items-center space-x-3">
                        {selectedPost.isOwner && (
                           <button 
                             onClick={(e) => handleDeletePost(e, selectedPost.id)}
                             className="p-3 bg-red-500/10 text-red-400 rounded-xl hover:bg-red-500/20 transition-all border border-red-500/20"
                           >
                             <TrashIcon className="w-5 h-5" />
                           </button>
                        )}
                        <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
                           <InformationCircleIcon className="w-5 h-5" />
                        </div>
                     </div>
                  </div>
               </div>
            </div>
         </div>
      )}
    </div>
  );
};

export default AnonymousTab;
