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
import { eventAPI } from '../../services/api';

const STEPS = [
  { id: 1, title: 'Basics', icon: TagIcon },
  { id: 2, title: 'Timing', icon: CalendarDaysIcon },
  { id: 3, title: 'Place', icon: MapPinIcon },
  { id: 4, title: 'Media', icon: PhotoIcon },
  { id: 5, title: 'Rules', icon: InformationCircleIcon }
];

const CATEGORIES = ['Academic', 'Social', 'Sports', 'Cultural', 'Career', 'Workshop', 'Other'];

const CreateEventPage: React.FC = () => {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Social',
    startTime: '',
    endTime: '',
    locationType: 'PHYSICAL',
    locationValue: '',
    maxAttendees: '',
    visibility: 'PUBLIC',
    rsvpEnabled: true
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const validateStep = () => {
    switch(step) {
      case 1: return formData.title && formData.description;
      case 2: return formData.startTime && formData.endTime && new Date(formData.endTime) > new Date(formData.startTime);
      case 3: return formData.locationValue;
      case 4: return true;
      case 5: return true;
      default: return false;
    }
  };

  const nextStep = () => { if (validateStep()) setStep(s => Math.min(s + 1, 5)); };
  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep()) return;
    setLoading(true);
    try {
      await eventAPI.createEvent(formData);
      router.push('/events');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col max-w-xl mx-auto relative">
      <Head><title>Create Event | Campus Chat</title></Head>
      
      <header className="bg-white px-6 py-4 border-b border-slate-100">
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => router.back()} className="p-2 -ml-2 text-slate-400 hover:text-slate-600">
            <ChevronLeftIcon className="w-6 h-6" />
          </button>
          <span className="text-[10px] font-black text-primary-600 uppercase tracking-widest">{STEPS[step-1].title}</span>
          <div className="w-9" />
        </div>
        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-primary-600 rounded-full" style={{ width: `${(step / 5) * 100}%` }} />
        </div>
      </header>

      <main className="flex-1 p-6">
        <form onSubmit={handleSubmit} className="h-full flex flex-col">
          {step === 1 && (
            <div className="space-y-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Title</label>
                <input name="title" required value={formData.title} onChange={handleInputChange} placeholder="E.g., Moonlight Gala" className="w-full px-5 py-4 bg-white border border-slate-200 rounded-[1.25rem] font-bold text-slate-800 outline-none placeholder:text-slate-300" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Description</label>
                <textarea name="description" required rows={4} value={formData.description} onChange={handleInputChange} placeholder="Describe your event..." className="w-full px-5 py-4 bg-white border border-slate-200 rounded-[1.25rem] font-bold text-slate-800 outline-none resize-none placeholder:text-slate-300" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Category</label>
                <select name="category" value={formData.category} onChange={handleInputChange} className="w-full px-5 py-4 bg-white border border-slate-200 rounded-[1.25rem] font-bold text-slate-800 outline-none appearance-none cursor-pointer">
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Starts At</label>
                <input type="datetime-local" name="startTime" required value={formData.startTime} onChange={handleInputChange} className="w-full px-5 py-4 bg-white border border-slate-200 rounded-[1.25rem] font-bold text-slate-800 outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ends At</label>
                <input type="datetime-local" name="endTime" required value={formData.endTime} onChange={handleInputChange} className="w-full px-5 py-4 bg-white border border-slate-200 rounded-[1.25rem] font-bold text-slate-800 outline-none" />
                {formData.startTime && formData.endTime && new Date(formData.endTime) <= new Date(formData.startTime) && <p className="text-[10px] font-bold text-rose-500 mt-2 ml-1">End time must be after start time.</p>}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div className="flex bg-slate-100 p-1 rounded-2xl">
                <button type="button" onClick={() => setFormData({ ...formData, locationType: 'PHYSICAL' })} className={`flex-1 py-3 rounded-xl text-xs font-black uppercase ${formData.locationType === 'PHYSICAL' ? 'bg-white shadow-sm text-primary-600' : 'text-slate-400'}`}>Physical</button>
                <button type="button" onClick={() => setFormData({ ...formData, locationType: 'ONLINE' })} className={`flex-1 py-3 rounded-xl text-xs font-black uppercase ${formData.locationType === 'ONLINE' ? 'bg-white shadow-sm text-primary-600' : 'text-slate-400'}`}>Online</button>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{formData.locationType === 'PHYSICAL' ? 'Venue Name' : 'Meeting Link'}</label>
                <input name="locationValue" required value={formData.locationValue} onChange={handleInputChange} placeholder={formData.locationType === 'PHYSICAL' ? 'E.g., Central Park Annex' : 'Zoom/Google Meet Link'} className="w-full px-5 py-4 bg-white border border-slate-200 rounded-[1.25rem] font-bold text-slate-800 outline-none" />
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="relative group overflow-hidden bg-slate-100 border-2 border-dashed border-slate-200 rounded-[2.5rem] aspect-video flex flex-col items-center justify-center cursor-pointer hover:border-primary-300">
                  {imagePreview ? (<><img src={imagePreview} className="w-full h-full object-cover" alt="Preview" /><div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center"><PlusIcon className="w-10 h-10 text-white" /></div></>) : (<div className="text-center p-8"><PhotoIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" /><p className="text-xs font-bold text-slate-400">Click to upload banner</p></div>)}
                  <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleImageUpload} />
                </div>
                <p className="text-[10px] text-slate-400 font-medium text-center">Optimized for 16:9 aspect ratio. Max 5MB.</p>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Max Attendees (Optional)</label>
                <input type="number" name="maxAttendees" value={formData.maxAttendees} onChange={handleInputChange} placeholder="No limit" className="w-full px-5 py-4 bg-white border border-slate-200 rounded-[1.25rem] font-bold text-slate-800 outline-none" />
              </div>
              <div className="flex items-center justify-between p-5 bg-white border border-slate-100 rounded-3xl shadow-sm">
                <div><p className="text-xs font-black text-slate-800">Public Visibility</p><p className="text-[10px] text-slate-400 font-medium">Anyone can see and join</p></div>
                <button type="button" onClick={() => setFormData({ ...formData, visibility: formData.visibility === 'PUBLIC' ? 'PRIVATE' : 'PUBLIC' })} className={`w-12 h-6 rounded-full relative ${formData.visibility === 'PUBLIC' ? 'bg-primary-500' : 'bg-slate-200'}`}>
                  <div className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm" style={{ left: formData.visibility === 'PUBLIC' ? 26 : 2 }} />
                </button>
              </div>
              <div className="flex items-center justify-between p-5 bg-white border border-slate-100 rounded-3xl shadow-sm">
                <div><p className="text-xs font-black text-slate-800">Allow RSVPs</p><p className="text-[10px] text-slate-400 font-medium">Allow users to join from the app</p></div>
                <button type="button" onClick={() => setFormData({ ...formData, rsvpEnabled: !formData.rsvpEnabled })} className={`w-12 h-6 rounded-full relative ${formData.rsvpEnabled ? 'bg-primary-500' : 'bg-slate-200'}`}>
                  <div className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm" style={{ left: formData.rsvpEnabled ? 26 : 2 }} />
                </button>
              </div>
            </div>
          )}

          <footer className="mt-auto py-8 flex items-center space-x-4">
            {step > 1 && (<button type="button" onClick={prevStep} className="flex-1 py-4 bg-white text-slate-500 border border-slate-200 rounded-[1.5rem] font-bold text-xs uppercase">Back</button>)}
            {step < 5 ? (<button type="button" onClick={nextStep} disabled={!validateStep()} className="flex-[2] py-4 bg-primary-600 text-white rounded-[1.5rem] font-black text-xs uppercase shadow-lg disabled:opacity-50 flex items-center justify-center space-x-2"><span>Next Step</span><ChevronLeftIcon className="w-4 h-4 stroke-[3px]" /></button>) : (<button type="submit" disabled={loading} className="flex-[2] py-4 bg-emerald-600 text-white rounded-[1.5rem] font-black text-xs uppercase shadow-lg disabled:opacity-50 flex items-center justify-center space-x-2">{loading ? (<div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full" />) : (<><SparklesIcon className="w-4 h-4" /><span>Create Event</span></>)}</button>)}
          </footer>
        </form>
      </main>
    </div>
  );
};

export default CreateEventPage;