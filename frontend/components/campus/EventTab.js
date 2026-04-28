import React, { useState, useEffect, useCallback } from 'react';
import { 
  CalendarIcon, 
  MapPinIcon, 
  CheckIcon,
  PlusIcon,
  XMarkIcon,
  TrashIcon,
  ClockIcon,
  UsersIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { eventAPI } from '../../services/api';
import { format } from 'date-fns';
import { useRouter } from 'next/router';
import { getCurrentUser } from '../../utils/helpers';
import { toast } from 'react-hot-toast';

const EventTab = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);

  useEffect(() => {
    setCurrentUser(getCurrentUser());
  }, []);

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

  const handleToggleJoin = async (e, eventId) => {
    e.stopPropagation(); // Don't open modal when clicking join
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
      
      // Update selected event if open
      if (selectedEvent && selectedEvent.id === eventId) {
        setSelectedEvent(prev => ({
          ...prev,
          isJoined: response.data.isJoined,
          attendeeCount: response.data.isJoined ? prev.attendeeCount + 1 : prev.attendeeCount - 1
        }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteEvent = async (e, eventId) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this event? This action cannot be undone.')) return;

    try {
      await eventAPI.deleteEvent(eventId);
      setEvents(prev => prev.filter(ev => ev.id !== eventId));
      toast.success('Event deleted');
      if (selectedEvent?.id === eventId) setSelectedEvent(null);
    } catch (err) {
      console.error('Failed to delete event:', err);
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
        <div className="w-10 h-10 border-4 border-slate-100 border-t-primary-500 rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Create Button Inline */}
      <div className="px-4 pt-4">
        <button 
          onClick={() => router.push('/events/create')}
          className="w-full flex items-center justify-between p-5 bg-white rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md active: shadow-slate-100/50"
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
            <div 
              key={event.id} 
              onClick={() => setSelectedEvent(event)}
              className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden group shadow-slate-200/20 cursor-pointer hover:border-primary-200 active:]"
            >
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1 pr-4">
                    <div className="flex items-center space-x-2 mb-1">
                       <span className="px-2 py-0.5 bg-primary-50 text-primary-600 text-[8px] font-black uppercase tracking-widest rounded-md border border-primary-100/50">
                          {event.category || 'Event'}
                       </span>
                    </div>
                    <h2 className="text-xl font-black text-slate-900 leading-tight tracking-tight mb-2 group-hover:text-primary-600 uppercase">
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
                  <a 
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent('Koforidua Technical University ' + (event.location || event.locationValue))}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center space-x-3 bg-slate-50 p-3 rounded-2xl border border-slate-100/50 hover:bg-primary-50"
                  >
                    <MapPinIcon className="w-4 h-4 text-emerald-500" />
                    <p className="text-[10px] font-bold text-slate-700 truncate">{event.location || event.locationValue}</p>
                  </a>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                  <div className="flex items-center space-x-4">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                      {event.attendeeCount || 0} Going
                    </span>
                    {(currentUser?.id === event.creatorId || currentUser?.role === 'ADMIN') && (
                      <button 
                        onClick={(e) => handleDeleteEvent(e, event.id)}
                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <button 
                    onClick={(e) => handleToggleJoin(e, event.id)}
                    className={`px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest  active: ${
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

      {/* Detailed Modal Overlay */}
      {selectedEvent && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 fade-in">
           {/* Backdrop */}
           <div 
             className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" 
             onClick={() => setSelectedEvent(null)}
           />
           
           {/* Modal Body */}
           <div className="relative w-full max-w-xl bg-white rounded-t-[3rem] sm:rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              {/* Header/Banner Area */}
              <div className="h-48 bg-primary-600 relative shrink-0">
                 {selectedEvent.bannerUrl ? (
                   <img src={selectedEvent.bannerUrl} className="w-full h-full object-cover opacity-60" alt="" />
                 ) : (
                   <div className="w-full h-full bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center">
                      <CalendarIcon className="w-20 h-20 text-white/10" />
                   </div>
                 )}
                 <button 
                   onClick={() => setSelectedEvent(null)}
                   className="absolute top-6 right-6 p-2 bg-black/20 backdrop-blur-md text-white rounded-2xl hover:bg-black/40"
                 >
                    <XMarkIcon className="w-6 h-6" />
                 </button>
                 
                 <div className="absolute -bottom-1 left-0 right-0 h-10 bg-white rounded-t-[3rem]" />
              </div>

              {/* Content Area */}
              <div className="px-8 pb-10 overflow-y-auto custom-scrollbar">
                 <div className="flex items-center space-x-2 mb-4">
                    <span className="px-3 py-1 bg-primary-50 text-primary-600 text-[10px] font-black uppercase tracking-widest rounded-xl border border-primary-100">
                       {selectedEvent.category}
                    </span>
                 </div>
                 
                 <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight leading-none mb-6">
                    {selectedEvent.title}
                 </h2>
                 
                 <div className="grid grid-cols-1 gap-4 mb-8">
                    <div className="flex items-center space-x-4 p-4 bg-slate-50 rounded-3xl border border-slate-100">
                       <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-primary-500 shadow-sm">
                          <ClockIcon className="w-6 h-6" />
                       </div>
                       <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Time & Date</p>
                          <p className="text-sm font-bold text-slate-700">
                             {format(new Date(selectedEvent.dateTime || selectedEvent.startTime), 'EEEE, MMMM do')} @ {format(new Date(selectedEvent.dateTime || selectedEvent.startTime), 'p')}
                          </p>
                       </div>
                    </div>
                    
                    <div className="flex items-center space-x-4 p-4 bg-slate-50 rounded-3xl border border-slate-100">
                       <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-emerald-500 shadow-sm">
                          <MapPinIcon className="w-6 h-6" />
                       </div>
                       <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Location</p>
                          <p className="text-sm font-bold text-slate-700">{selectedEvent.location || selectedEvent.locationValue}</p>
                       </div>
                    </div>

                    <div className="flex items-center space-x-4 p-4 bg-slate-50 rounded-3xl border border-slate-100">
                       <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-orange-500 shadow-sm">
                          <UsersIcon className="w-6 h-6" />
                       </div>
                       <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Attendance</p>
                          <p className="text-sm font-bold text-slate-700">{selectedEvent.attendeeCount || 0} People are going</p>
                       </div>
                    </div>
                 </div>

                 <div className="mb-8">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center space-x-2">
                       <InformationCircleIcon className="w-4 h-4" />
                       <span>About this event</span>
                    </h3>
                    <p className="text-base text-slate-600 font-medium leading-relaxed bg-slate-50/50 p-6 rounded-3xl border border-slate-100 italic">
                       {selectedEvent.description}
                    </p>
                 </div>

                 {/* Host Info */}
                 <div className="flex items-center justify-between p-6 bg-slate-900 rounded-3xl">
                    <div className="flex items-center space-x-4">
                       <div className={`w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-white font-black overflow-hidden`}>
                          {selectedEvent.creator?.avatar ? (
                            <img src={selectedEvent.creator.avatar} className="w-full h-full object-cover" alt="" />
                          ) : (
                            selectedEvent.creator?.name?.charAt(0) || 'H'
                          )}
                       </div>
                       <div>
                          <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-0.5">Hosted By</p>
                          <p className="text-sm font-bold text-white">{selectedEvent.creator?.name || 'Campus Host'}</p>
                       </div>
                    </div>
                    
                    <button 
                      onClick={(e) => handleToggleJoin(e, selectedEvent.id)}
                      className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest  ${
                         selectedEvent.isJoined 
                         ? 'bg-white/10 text-white border border-white/20' 
                         : 'bg-primary-500 text-white shadow-xl shadow-primary-500/30'
                      }`}
                    >
                       {selectedEvent.isJoined ? 'I\'m Going' : 'Count me in'}
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default EventTab;
