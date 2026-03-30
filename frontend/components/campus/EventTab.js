import React, { useState, useEffect, useCallback } from 'react';
import { 
  CalendarIcon, 
  MapPinIcon, 
  CheckIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import { eventAPI } from '../../services/api';
import { format } from 'date-fns';
import { useRouter } from 'next/router';

const EventTab = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);

  const fetchEvents = useCallback(async (pageNum = 1, shouldAppend = false) => {
    try {
      const response = await eventAPI.getEvents(pageNum);
      const newItems = response.data.events || [];
      
      if (shouldAppend) {
        setEvents(prev => [...prev, ...newItems]);
      } else {
        setEvents(newItems);
      }
      setHasMore(response.data.hasMore);
    } catch (error) {
      console.error('Failed to fetch events:', error);
    } finally {
      setLoading(false);
      setIsFetchingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents(1, false);
  }, [fetchEvents]);

  const handleToggleJoin = async (eventId) => {
    try {
      const response = await eventAPI.toggleJoin(eventId);
      setEvents(prev => prev.map(e => {
        if (e.id === eventId) {
          return {
            ...e,
            isJoined: response.data.isJoined,
            attendeeCount: response.data.isJoined ? e.attendeeCount + 1 : e.attendeeCount - 1
          };
        }
        return e;
      }));
    } catch (err) {
      console.error(err);
    }
  };

  const loadMore = () => {
    if (hasMore && !isFetchingMore) {
      setIsFetchingMore(true);
      const nextPage = page + 1;
      setPage(nextPage);
      fetchEvents(nextPage, true);
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
    <div className="space-y-6">
      {/* Create Button Inline */}
      <div className="px-4 pt-4">
        <button 
          onClick={() => router.push('/events/create')}
          className="w-full flex items-center justify-between p-5 bg-white rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all active:scale-95 shadow-slate-100/50"
        >
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-primary-100/50 rounded-2xl flex items-center justify-center text-primary-600">
               <PlusIcon className="w-6 h-6 stroke-[3px]" />
            </div>
            <div className="text-left">
              <p className="text-xs font-black uppercase tracking-widest text-primary-600 mb-0.5">Host an Activity</p>
              <p className="text-[10px] font-bold text-slate-400">Share your event with the campus</p>
            </div>
          </div>
          <p className="px-5 py-2 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest">Create</p>
        </button>
      </div>

      {events.length === 0 ? (
        <div className="py-20 text-center">
          <CalendarIcon className="w-12 h-12 text-slate-200 mx-auto mb-4" />
          <h3 className="text-base font-black text-slate-800 uppercase tracking-widest">No Events</h3>
          <p className="text-xs text-slate-400 font-bold mt-2">Check back later or host one!</p>
        </div>
      ) : (
        <div className="grid gap-6 px-4 pb-12">
          {events.map((event) => (
            <div key={event.id} className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden group shadow-slate-200/20">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1 pr-4">
                    <h2 className="text-xl font-black text-slate-900 leading-tight tracking-tight mb-2 group-hover:text-primary-600 transition-colors uppercase">
                      {event.title}
                    </h2>
                    <p className="text-[11px] text-slate-500 font-bold line-clamp-2 leading-relaxed opacity-70">
                      {event.description}
                    </p>
                  </div>
                  <div className="bg-primary-50 px-3 py-2 rounded-2xl flex flex-col items-center justify-center min-w-[64px] border border-primary-100/50">
                    <span className="text-[9px] font-black text-primary-400 uppercase tracking-widest leading-none mb-1">
                      {format(new Date(event.dateTime || event.startTime), 'MMM')}
                    </span>
                    <span className="text-xl font-black text-primary-600">
                      {format(new Date(event.dateTime || event.startTime), 'dd')}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="flex items-center space-x-3 bg-slate-50 p-3 rounded-2xl border border-slate-100/50">
                    <CalendarIcon className="w-4 h-4 text-primary-500" />
                    <p className="text-[10px] font-bold text-slate-700 truncate">{format(new Date(event.dateTime || event.startTime), 'p')}</p>
                  </div>
                  <div className="flex items-center space-x-3 bg-slate-50 p-3 rounded-2xl border border-slate-100/50">
                    <MapPinIcon className="w-4 h-4 text-emerald-500" />
                    <p className="text-[10px] font-bold text-slate-700 truncate">{event.location || event.locationValue}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                    {event.attendeeCount || 0} Going
                  </span>
                  <button 
                    onClick={() => handleToggleJoin(event.id)}
                    className={`px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${
                      event.isJoined 
                      ? 'bg-primary-50 text-primary-600' 
                      : 'bg-slate-900 text-white'
                    }`}
                  >
                    {event.isJoined ? 'Joined' : 'Join Now'}
                  </button>
                </div>
              </div>
            </div>
          ))}
          {hasMore && (
            <button onClick={loadMore} className="w-full py-6 text-[9px] font-black text-slate-400 uppercase tracking-widest">
              {isFetchingMore ? 'Loading...' : 'See More'}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default EventTab;
