import React, { useState, useEffect, useCallback } from 'react';
import { 
  UserCircleIcon, 
  HashtagIcon,
  PlusIcon,
  ShieldCheckIcon,
  PaperAirplaneIcon
} from '@heroicons/react/24/outline';
import { anonymousAPI } from '../../services/api';
import { format } from 'date-fns';

const AnonymousTab = () => {
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState([]);
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);

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
      setPosts(prev => [response.data.post, ...prev]);
      setContent('');
      setTags('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
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
            <div key={post.id} className="bg-white rounded-[2rem] border border-slate-100 p-6 shadow-sm shadow-slate-200/10">
               <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2.5">
                     <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-200 border border-slate-100/50">
                        <UserCircleIcon className="w-6 h-6" />
                     </div>
                     <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter italic">Anonymous User</span>
                  </div>
                  <span className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em]">{format(new Date(post.createdAt), 'p')}</span>
               </div>
               <p className="text-sm font-medium text-slate-700 leading-relaxed break-words">{post.content}</p>
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
    </div>
  );
};

export default AnonymousTab;
