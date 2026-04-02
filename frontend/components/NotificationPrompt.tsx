import React, { useState, useEffect } from 'react';
import { BellIcon, BellSlashIcon } from '@heroicons/react/24/outline';
import { requestOneSignalPermission } from '../services/oneSignal';
import { motion, AnimatePresence } from 'framer-motion';

const NotificationPrompt: React.FC = () => {
  const [permission, setPermission] = useState<string>('default');
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission);
      if (Notification.permission === 'default') {
        setIsVisible(true);
      }
    }
  }, []);

  const handleEnable = async () => {
    await requestOneSignalPermission();
    if ('Notification' in window) {
      setPermission(Notification.permission);
      if (Notification.permission === 'granted') {
        setIsVisible(false);
      }
    }
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        className="bg-primary-50 border-b border-primary-100 px-4 py-3"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center text-white shrink-0 shadow-lg shadow-primary-200">
              <BellIcon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">Don't miss a message!</p>
              <p className="text-[11px] font-medium text-gray-500 uppercase tracking-tight">Enable push notifications</p>
            </div>
          </div>
          
          <button
            onClick={handleEnable}
            className="bg-primary-600 text-white px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest shadow-md hover:bg-primary-700 active:scale-95 transition-all"
          >
            Enable Now
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default NotificationPrompt;
