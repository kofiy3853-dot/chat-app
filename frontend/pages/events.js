import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import { 
  CalendarIcon, 
  MapPinIcon, 
  UsersIcon, 
  PlusIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  CheckIcon,
  UserGroupIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { eventAPI } from '../services/api';
import CreateEventModal from '../components/events/CreateEventModal';
import { format } from 'date-fns';

export default function Events() {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

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

  const filteredEvents = events.filter(e => 
    e.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    e.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
          <p className="mt-4 text-slate-500 font-bold text-xs uppercase tracking-widest text-[10px]">Loading Events...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-32">
      <Head>
        <title>Campus Events | Campus Chat</title>
      </Head>

      {/* Header */}
      <div className="sticky top-0 bg-white/80 backdrop-blur-xl z-30 border-b border-slate-200/60 shadow-sm">
        <header className="sticky top-0 bg-white/80 backdrop-blur-xl z-20 px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <h1 className="text-xl font-black text-slate-800 tracking-tight">Events</h1>
          <button 
            onClick={() => router.push('/events/create')}
            aria-label="Create new event"
            className="bg-primary-600 hover:bg-primary-500 text-white p-2.5 rounded-2xl shadow-lg shadow-primary-200 transition-all active:scale-90 flex items-center space-x-2"
          >
            <PlusIcon className="w-5 h-5 stroke-[3px]" />
            <span className="text-xs font-black uppercase tracking-widest pr-1">Host</span>
          </button>
        </header>

        {/* Search */}
        <div className="max-w-xl mx-auto px-6 pb-4 pt-4">
          <div className="relative group">
            <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary-500 transition-colors" />
            <input 
              type="text"
              placeholder="Search by title or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-slate-100/50 border-transparent focus:border-primary-200 focus:bg-white rounded-2xl text-sm font-medium transition-all outline-none"
            />
          </div>
        </div>
      </div>

      {/* Events List */}
      <div className="max-w-xl mx-auto p-4 space-y-6">
        {filteredEvents.length === 0 ? (
          <div className="py-32 text-center">
            <div className="w-20 h-20 bg-white rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-xl shadow-slate-200/50 rotate-12">
              <CalendarIcon className="w-10 h-10 text-slate-200" />
            </div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight">No Events Found</h3>
            <p className="text-sm text-slate-400 mt-2 font-medium max-w-[240px] mx-auto">
              Be the first to organize something amazing on campus!
            </p>
          </div>
        ) : (
          <div className="grid gap-6">
            {filteredEvents.map((event) => (
              <div 
                key={event.id}
                className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden group shadow-slate-200/30"
              >
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1 pr-4">
                       <h2 className="text-xl font-black text-slate-900 leading-tight tracking-tight mb-2 group-hover:text-primary-600 transition-colors">
                         {event.title}
                       </h2>
                       <p className="text-sm text-slate-500 font-medium line-clamp-2 leading-relaxed">
                         {event.description}
                       </p>
                    </div>
                    <div className="bg-primary-50 px-3 py-2 rounded-2xl flex flex-col items-center justify-center min-w-[64px] border border-primary-100/50 shrink-0">
                       <span className="text-[10px] font-black text-primary-400 uppercase tracking-widest leading-none mb-1">
                         {format(new Date(event.dateTime), 'MMM')}
                       </span>
                       <span className="text-xl font-black text-primary-600 leading-none">
                         {format(new Date(event.dateTime), 'dd')}
                       </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="flex items-center space-x-3 bg-slate-50/80 p-3 rounded-2xl border border-slate-100/50">
                      <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center shadow-sm shrink-0">
                        <CalendarIcon className="w-4 h-4 text-primary-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Time</p>
                        <p className="text-[11px] font-bold text-slate-700 truncate">{format(new Date(event.dateTime), 'p')}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3 bg-slate-50/80 p-3 rounded-2xl border border-slate-100/50">
                      <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center shadow-sm shrink-0">
                        <MapPinIcon className="w-4 h-4 text-emerald-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Location</p>
                        <p className="text-[11px] font-bold text-slate-700 truncate">{event.location}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                    <div className="flex items-center space-x-2">
                       <div className="flex -space-x-2">
                         {[...Array(Math.min(3, event.attendeeCount || 0))].map((_, i) => (
                           <div key={i} className="w-6 h-6 rounded-full border-2 border-white bg-slate-200">
                             <img src={`https://i.pravatar.cc/100?u=${event.id}${i}`} className="w-full h-full rounded-full" alt="Attendee" />
                           </div>
                         ))}
                         {(event.attendeeCount || 0) > 3 && (
                            <div className="w-6 h-6 rounded-full border-2 border-white bg-primary-100 flex items-center justify-center text-[8px] font-black text-primary-600">
                              +{event.attendeeCount - 3}
                            </div>
                         )}
                       </div>
                       <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                         {event.attendeeCount || 0} Going
                       </span>
                    </div>

                    <button 
                      onClick={() => handleToggleJoin(event.id)}
                      aria-label={event.isJoined ? "Leave event" : "Join event"}
                      className={`px-6 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all active:scale-95 flex items-center space-x-2 ${
                        event.isJoined 
                          ? 'bg-primary-50 text-primary-600 hover:bg-primary-100' 
                          : 'bg-slate-900 text-white hover:bg-slate-800 shadow-lg shadow-slate-200'
                      }`}
                    >
                      {event.isJoined ? (
                        <>
                          <CheckIcon className="w-4 h-4 stroke-[3px]" />
                          <span>Joined</span>
                        </>
                      ) : (
                        <span>Join Now</span>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {hasMore && (
          <button 
            onClick={loadMore}
            disabled={isFetchingMore}
            className="w-full py-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] hover:text-primary-600 transition-colors"
          >
            {isFetchingMore ? 'Uncovering more events...' : 'See earlier events'}
          </button>
        )}
      </div>

      {/* Modal is now replaced by /events/create page */}
    </div>
  );
}
