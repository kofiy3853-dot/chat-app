import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, PhotoIcon, PencilIcon, SparklesIcon } from '@heroicons/react/24/solid';
import api, { statusAPI } from '../services/api';
import { toast } from 'react-hot-toast';

interface UploadStatusModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const BACKGROUND_COLORS = [
  '#6B73FF', '#FF6B6B', '#4ECDC4', '#45B7D1', '#9B59FF', '#2D3436', '#FAB1A0'
];

const UploadStatusModal: React.FC<UploadStatusModalProps> = ({ onClose, onSuccess }) => {
  const [type, setType] = useState<'TEXT' | 'IMAGE'>('TEXT');
  const [textContent, setTextContent] = useState('');
  const [bgColor, setBgColor] = useState(BACKGROUND_COLORS[0]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setType('IMAGE');
    }
  };

  const handleUpload = async () => {
    setLoading(true);
    try {
      let contentUrl = '';

      if (type === 'IMAGE' && selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        const uploadRes = await statusAPI.uploadImage(formData);
        contentUrl = uploadRes.data.fileUrl;
      }

      await statusAPI.createStatus({
        type,
        contentUrl,
        textContent,
        backgroundColor: bgColor,
        caption
      });

      onSuccess();
      onClose();
    } catch (error) {
      toast.error('Failed to upload status. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-white w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
      >
        <div className="p-6 border-b border-slate-50 flex items-center justify-between">
          <h3 className="text-xl font-black text-slate-800 tracking-tight">Post Status</h3>
          <button onClick={onClose} title="Close modal" aria-label="Close modal" className="p-2 hover:bg-slate-50 rounded-full transition-colors">
            <XMarkIcon className="w-6 h-6 text-slate-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar">
          {/* Toggle Type */}
          <div className="flex p-4 space-x-2">
            <button 
              onClick={() => setType('TEXT')}
              className={`flex-1 py-3 rounded-2xl font-bold transition-all flex items-center justify-center space-x-2 ${type === 'TEXT' ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/20' : 'bg-slate-50 text-slate-400'}`}
            >
              <PencilIcon className="w-5 h-5" />
              <span>Text</span>
            </button>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className={`flex-1 py-3 rounded-2xl font-bold transition-all flex items-center justify-center space-x-2 ${type === 'IMAGE' ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/20' : 'bg-slate-50 text-slate-400'}`}
            >
              <PhotoIcon className="w-5 h-5" />
              <span>Image</span>
            </button>
            <input 
              type="file" 
              className="hidden" 
              ref={fileInputRef} 
              accept="image/*" 
              onChange={handleFileChange}
              title="Upload image"
              aria-label="Upload image"
            />
          </div>

          {/* Preview Area */}
          <div className="px-6 pb-6">
            <AnimatePresence mode="wait">
              {type === 'TEXT' ? (
                <motion.div 
                  key="text"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="rounded-3xl p-8 min-h-[240px] flex flex-col items-center justify-center transition-colors shadow-inner"
                  style={{ backgroundColor: bgColor }}
                >
                  <textarea
                    placeholder="Type your status..."
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    className="w-full bg-transparent border-none outline-none text-white text-2xl font-black text-center placeholder-white/40 resize-none h-32"
                  />
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    {BACKGROUND_COLORS.map(color => (
                       <button
                         key={color}
                         onClick={() => setBgColor(color)}
                         title={`Select ${color} background`}
                         aria-label={`Select ${color} background`}
                         className={`w-8 h-8 rounded-full border-2 transition-transform active:scale-90 ${bgColor === color ? 'border-white scale-110' : 'border-transparent opacity-50'}`}
                         style={{ backgroundColor: color }}
                       />
                    ))}
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key="image"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-4"
                >
                  <div className="aspect-[4/3] rounded-3xl bg-slate-100 overflow-hidden relative group">
                    <img src={previewUrl!} className="w-full h-full object-cover" alt="" />
                    <button 
                      onClick={() => { setSelectedFile(null); setPreviewUrl(null); setType('TEXT'); }}
                      title="Remove image"
                      aria-label="Remove image"
                      className="absolute top-3 right-3 p-2 bg-black/50 backdrop-blur-md rounded-full text-white"
                    >
                      <XMarkIcon className="w-5 h-5" />
                    </button>
                  </div>
                  <input
                    placeholder="Add a caption..."
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    className="w-full bg-slate-50 rounded-2xl px-5 py-4 text-slate-700 font-bold outline-none border border-transparent focus:border-primary-100 transition-all"
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="p-6 bg-slate-50/50 border-t border-slate-100">
           <button
             disabled={loading || (type === 'TEXT' && !textContent) || (type === 'IMAGE' && !selectedFile)}
             onClick={handleUpload}
             className="w-full py-4 rounded-2xl bg-primary-500 text-white font-black text-lg shadow-xl shadow-primary-500/30 disabled:opacity-50 disabled:shadow-none transition-all active:scale-[0.98] flex items-center justify-center space-x-2"
           >
             {loading ? (
               <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
             ) : (
               <>
                 <SparklesIcon className="w-6 h-6" />
                 <span>Upload Status</span>
               </>
             )}
           </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default UploadStatusModal;
