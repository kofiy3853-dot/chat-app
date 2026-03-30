import { useState } from 'react';
import { 
  XMarkIcon, 
  CalendarIcon, 
  MapPinIcon, 
  DocumentTextIcon, 
  TagIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { eventAPI } from '../../services/api';

export default function CreateEventModal({ isOpen, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    dateTime: '',
    location: ''
  });

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await eventAPI.createEvent(formData);
      onSuccess(response.data);
      onClose();
    } catch (error) {
      console.error('Failed to create event:', error);
      alert('Error creating event. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in" 
        onClick={onClose} 
      />
      <div className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-500">
        
        {/* Header */}
        <div className="bg-slate-50/80 px-8 py-6 border-b border-slate-100 flex items-center justify-between">
           <div>
             <h2 className="text-2xl font-black text-slate-800 tracking-tight">Post Activity</h2>
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Let's build community</p>
           </div>
           <button 
             onClick={onClose}
             className="p-2 bg-white rounded-xl text-slate-400 hover:text-slate-600 hover:shadow-sm transition-all border border-slate-100 active:scale-90"
           >
             <XMarkIcon className="w-5 h-5 stroke-2" />
           </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Event Title</label>
            <div className="relative">
              <TagIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                required
                type="text"
                placeholder="What's happening?"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 focus:bg-white outline-none transition-all"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Context / Description</label>
            <div className="relative">
              <DocumentTextIcon className="absolute left-4 top-4 w-4 h-4 text-slate-400" />
              <textarea
                required
                rows="3"
                placeholder="Share the details..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 focus:bg-white outline-none transition-all resize-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date & Time</label>
              <div className="relative">
                <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  required
                  type="datetime-local"
                  value={formData.dateTime}
                  onChange={(e) => setFormData({ ...formData, dateTime: e.target.value })}
                  className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 focus:bg-white outline-none transition-all appearance-none"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Location</label>
              <div className="relative">
                <MapPinIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  required
                  type="text"
                  placeholder="Where at?"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 focus:bg-white outline-none transition-all"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center space-x-3 py-4.5 bg-primary-600 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-widest hover:bg-primary-500 active:scale-[0.98] transition-all shadow-xl shadow-primary-200 disabled:opacity-50 mt-4"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            ) : (
              <>
                <SparklesIcon className="w-4 h-4" />
                <span>Launch Now</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
