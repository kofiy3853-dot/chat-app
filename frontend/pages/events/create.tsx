import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { 
  PlusIcon,
  ChevronLeftIcon,
  CheckCircleIcon,
  SparklesIcon,
  TagIcon,
  MapPinIcon,
  CalendarDaysIcon,
  InformationCircleIcon,
  PhotoIcon
} from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import { eventAPI } from '../../services/api';

const STEPS = [
  { id: 1, title: 'Basics', icon: TagIcon },
  { id: 2, title: 'Timing', icon: CalendarDaysIcon },
  { id: 3, title: 'Place', icon: MapPinIcon },
  { id: 4, title: 'Media', icon: PhotoIcon },
  { id: 5, title: 'Rules', icon: InformationCircleIcon }
];

const CATEGORIES = ['ACADEMIC', 'SOCIAL', 'SPORTS', 'CLUB', 'OTHER'];

const CreateEventPage = () => {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'SOCIAL',
    startTime: '',
    endTime: '',
    locationType: 'PHYSICAL',
    locationValue: '',
    bannerUrl: '',
    maxAttendees: '',
    visibility: 'PUBLIC',
    rsvpEnabled: true
  });

  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Auto-save & Restore
  useEffect(() => {
    const saved = localStorage.getItem('event_draft');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setFormData(prev => ({ ...prev, ...parsed }));
      } catch (e) {
        console.error('Draft restoration failed', e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('event_draft', JSON.stringify(formData));
  }, [formData]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setFormData(prev => ({ ...prev, [name]: val }));
  };

  const nextStep = () => {
    if (step < 5) setStep(step + 1);
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  const validateStep = () => {
    if (step === 1) return formData.title && formData.description;
    if (step === 2) {
      if (!formData.startTime || !formData.endTime) return false;
      return new Date(formData.endTime) > new Date(formData.startTime);
    }
    if (step === 3) return formData.locationValue;
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep()) return;

    setLoading(true);
    try {
      await eventAPI.createEvent(formData);
      setSuccess(true);
      localStorage.removeItem('event_draft');
      setTimeout(() => router.push('/campus'), 2000);
    } catch (error) {
      console.error('Submission failed', error);
      alert('Failed to create event. Please check all fields.');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // In a real app, upload to Supabase storage here
      // For now, we'll simulation with a preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
        setFormData(prev => ({ ...prev, bannerUrl: 'https://via.placeholder.com/800x400?text=Event+Banner' }));
      };
      reader.readAsDataURL(file);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in duration-500">
        <div className="w-24 h-24 bg-primary-100 rounded-[2.5rem] flex items-center justify-center mb-8 shadow-xl shadow-primary-200/50 rotate-6">
          <CheckCircleIcon className="w-12 h-12 text-primary-600" />
        </div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tighter mb-2">Event Launched!</h1>
        <p className="text-slate-500 font-medium">Your event is now live and everyone's invited.</p>
        <p className="text-[10px] font-black text-primary-400 uppercase tracking-[0.3em] mt-8">Redirecting...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col max-w-xl mx-auto shadow-2xl relative">
      <Head>
        <title>Create Event | Campus Chat</title>
      </Head>

      {/* Header */}
      <header className="sticky top-0 bg-white/80 backdrop-blur-xl z-20 px-6 py-5 border-b border-slate-100 flex items-center justify-between">
        <button onClick={() => router.back()} aria-label="Go back" className="p-2 hover:bg-slate-100 rounded-xl transition-all active:scale-90">
          <ChevronLeftIcon className="w-5 h-5 text-slate-400 stroke-2" />
        </button>
        <div className="text-center">
           <h1 className="text-lg font-black text-slate-800 tracking-tight">Create Event</h1>
           <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-0.5">Community Host</p>
        </div>
        <div className="w-9" /> {/* Spacer */}
      </header>

      {/* Progress Bar */}
      <div className="bg-white px-6 py-4">
        <div className="flex justify-between items-center mb-3">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Step {step} of 5
          </span>
          <span className="text-[10px] font-black text-primary-600 uppercase tracking-widest">
            {STEPS[step-1].title}
          </span>
        </div>
        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${(step / 5) * 100}%` }}
            className="h-full bg-primary-600 rounded-full shadow-[0_0_10px_rgba(37,99,235,0.3)] transition-all"
          />
        </div>
      </div>

      <main className="flex-1 p-6">
        <form onSubmit={handleSubmit} className="h-full flex flex-col">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Title</label>
                  <input
                    name="title"
                    required
                    value={formData.title}
                    onChange={handleInputChange}
                    placeholder="E.g., Moonlight Gala"
                    className="w-full px-5 py-4 bg-white border border-slate-200 rounded-[1.25rem] font-bold text-slate-800 focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none transition-all placeholder:text-slate-300"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">What's it about?</label>
                  <textarea
                    name="description"
                    required
                    rows={4}
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Describe your event..."
                    className="w-full px-5 py-4 bg-white border border-slate-200 rounded-[1.25rem] font-bold text-slate-800 focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none transition-all resize-none placeholder:text-slate-300"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Category</label>
                  <select
                    name="category"
                    title="Event category"
                    aria-label="Event category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className="w-full px-5 py-4 bg-white border border-slate-200 rounded-[1.25rem] font-bold text-slate-800 focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none transition-all appearance-none cursor-pointer"
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Starts At</label>
                  <input
                    type="datetime-local"
                    name="startTime"
                    required
                    title="Event start time"
                    aria-label="Event start time"
                    value={formData.startTime}
                    onChange={handleInputChange}
                    className="w-full px-5 py-4 bg-white border border-slate-200 rounded-[1.25rem] font-bold text-slate-800 focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ends At</label>
                  <input
                    type="datetime-local"
                    name="endTime"
                    required
                    title="Event end time"
                    aria-label="Event end time"
                    value={formData.endTime}
                    onChange={handleInputChange}
                    className="w-full px-5 py-4 bg-white border border-slate-200 rounded-[1.25rem] font-bold text-slate-800 focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none transition-all"
                  />
                  {formData.startTime && formData.endTime && new Date(formData.endTime) <= new Date(formData.startTime) && (
                    <p className="text-[10px] font-bold text-rose-500 mt-2 ml-1">End time must be after start time.</p>
                  )}
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="flex bg-slate-100 p-1 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, locationType: 'PHYSICAL' })}
                    className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${formData.locationType === 'PHYSICAL' ? 'bg-white shadow-sm text-primary-600' : 'text-slate-400'}`}
                  >
                    Physical
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, locationType: 'ONLINE' })}
                    className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${formData.locationType === 'ONLINE' ? 'bg-white shadow-sm text-primary-600' : 'text-slate-400'}`}
                  >
                    Online
                  </button>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    {formData.locationType === 'PHYSICAL' ? 'Venue Name' : 'Meeting Link'}
                  </label>
                  <input
                    name="locationValue"
                    required
                    value={formData.locationValue}
                    onChange={handleInputChange}
                    placeholder={formData.locationType === 'PHYSICAL' ? 'E.g., Central Park Annex' : 'Zoom/Google Meet Link'}
                    className="w-full px-5 py-4 bg-white border border-slate-200 rounded-[1.25rem] font-bold text-slate-800 focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none transition-all"
                  />
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="space-y-4">
                  <div className="relative group overflow-hidden bg-slate-100 border-2 border-dashed border-slate-200 rounded-[2.5rem] aspect-video flex flex-col items-center justify-center cursor-pointer hover:border-primary-300 transition-all">
                    {imagePreview ? (
                      <>
                        <img src={imagePreview} className="w-full h-full object-cover" alt="Preview" />
                        <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                          <PlusIcon className="w-10 h-10 text-white" />
                        </div>
                      </>
                    ) : (
                      <div className="text-center p-8">
                        <PhotoIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-xs font-bold text-slate-400">Click to upload banner</p>
                      </div>
                    )}
                    <input type="file" accept="image/*" aria-label="Upload event banner image" title="Upload event banner image" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleImageUpload} />
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium text-center">Optimized for 16:9 aspect ratio. Max 5MB.</p>
                </div>
              </motion.div>
            )}

            {step === 5 && (
              <motion.div
                key="step5"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Max Attendees (Optional)</label>
                  <input
                    type="number"
                    name="maxAttendees"
                    value={formData.maxAttendees}
                    onChange={handleInputChange}
                    placeholder="No limit"
                    className="w-full px-5 py-4 bg-white border border-slate-200 rounded-[1.25rem] font-bold text-slate-800 focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none transition-all"
                  />
                </div>
                
                <div className="flex items-center justify-between p-5 bg-white border border-slate-100 rounded-3xl shadow-sm">
                   <div>
                     <p className="text-xs font-black text-slate-800">Public Visibility</p>
                     <p className="text-[10px] text-slate-400 font-medium">Anyone can see and join</p>
                   </div>
                   <button
                     type="button"
                     aria-label={`Toggle visibility: currently ${formData.visibility}`}
                     onClick={() => setFormData({ ...formData, visibility: formData.visibility === 'PUBLIC' ? 'PRIVATE' : 'PUBLIC' })}
                     className={`w-12 h-6 rounded-full transition-all relative ${formData.visibility === 'PUBLIC' ? 'bg-primary-500' : 'bg-slate-200'}`}
                   >
                     <motion.div 
                       animate={{ x: formData.visibility === 'PUBLIC' ? 26 : 2 }}
                       className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
                     />
                   </button>
                </div>

                <div className="flex items-center justify-between p-5 bg-white border border-slate-100 rounded-3xl shadow-sm">
                   <div>
                     <p className="text-xs font-black text-slate-800">Allow RSVPs</p>
                     <p className="text-[10px] text-slate-400 font-medium">Allow users to join from the app</p>
                   </div>
                   <button
                     type="button"
                     aria-label={`Toggle RSVPs: currently ${formData.rsvpEnabled ? 'enabled' : 'disabled'}`}
                     onClick={() => setFormData({ ...formData, rsvpEnabled: !formData.rsvpEnabled })}
                     className={`w-12 h-6 rounded-full transition-all relative ${formData.rsvpEnabled ? 'bg-primary-500' : 'bg-slate-200'}`}
                   >
                     <motion.div 
                       animate={{ x: formData.rsvpEnabled ? 26 : 2 }}
                       className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
                     />
                   </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <footer className="mt-auto py-8 flex items-center space-x-4">
            {step > 1 && (
              <button
                type="button"
                onClick={prevStep}
                className="flex-1 py-4 bg-white text-slate-500 border border-slate-200 rounded-[1.5rem] font-bold text-xs uppercase tracking-widest active:scale-95 transition-all"
              >
                Back
              </button>
            )}
            
            {step < 5 ? (
              <button
                type="button"
                onClick={nextStep}
                disabled={!validateStep()}
                className="flex-[2] py-4 bg-primary-600 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-widest shadow-lg shadow-primary-200 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                <span>Next Step</span>
                <ChevronLeftIcon className="w-4 h-4 rotate-180 stroke-[3px]" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className="flex-[2] py-4 bg-emerald-600 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-200 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                {loading ? (
                   <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <SparklesIcon className="w-4 h-4" />
                    <span>Create Event</span>
                  </>
                )}
              </button>
            )}
          </footer>
        </form>
      </main>
    </div>
  );
};

export default CreateEventPage;
