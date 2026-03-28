import React, { useEffect } from 'react';
import { useCall } from '../context/CallContext';
import { 
  PhoneIcon, 
  VideoCameraIcon, 
  XMarkIcon, 
  MicrophoneIcon, 
  SpeakerWaveIcon,
  VideoCameraSlashIcon
} from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';

export default function CallInterface() {
  const { 
    call, 
    callAccepted, 
    myVideo, 
    userVideo, 
    stream, 
    remoteStream,
    callEnded,
    answerCall,
    rejectCall,
    leaveCall,
    toggleMute,
    toggleVideo,
    isMuted,
    isVideoOff
  } = useCall();

  // Reactive stream syncing is now handled via callback refs for higher reliability 
  // with conditionally rendered elements. 

  return (
    <div className="relative z-[999999]">
      <AnimatePresence>
        {/* Outgoing call (Caller's 'Calling...' screen) */}
        {call.isCalling && !callAccepted && (
          <motion.div
            key="outgoing"
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="fixed top-10 left-1/2 -translate-x-1/2 z-[999999] w-[90%] max-w-sm pointer-events-auto"
          >
            <div className="bg-white border-2 border-emerald-500 p-5 rounded-[2.5rem] shadow-[0_30px_60px_-15px_rgba(16,185,129,0.3)] flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center text-white text-xl font-black animate-pulse shadow-lg shadow-emerald-500/30">
                  {call.to?.name?.charAt(0) || '?'}
                </div>
                <div>
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest leading-none mb-1">Calling...</p>
                  <h3 className="text-base font-black text-slate-900 leading-tight">{call.to?.name || 'Contact'}</h3>
                </div>
              </div>
              <button
                onClick={leaveCall}
                className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white transition-all flex items-center justify-center shadow-lg"
              >
                <XMarkIcon className="w-7 h-7" />
              </button>
            </div>
          </motion.div>
        )}

        {/* Incoming Call UI - High Fidelity Full Screen */}
        {call.isReceivingCall && !callAccepted && (
          <motion.div 
            key="incoming"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000001] bg-slate-900/90 [backdrop-filter:blur(30px)] flex flex-col items-center justify-center p-6"
          >
            {/* Ambient Background Aura */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-primary-600/30 rounded-full blur-[100px] animate-pulse"></div>
            
            <div className="flex flex-col items-center space-y-12 relative z-10 w-full max-w-sm">
              {/* Caller Identity */}
              <div className="relative">
                <motion.div 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="w-44 h-44 rounded-[4rem] bg-white/10 border-2 border-white/20 flex items-center justify-center shadow-2xl overflow-hidden"
                >
                  <div className="w-40 h-40 rounded-[3.5rem] bg-gradient-to-tr from-primary-600 to-indigo-500 flex items-center justify-center text-white text-7xl font-black shadow-inner">
                    {call.from?.name?.charAt(0) || '?'}
                  </div>
                </motion.div>
                
                {/* Status Rings */}
                {[...Array(3)].map((_, i) => (
                  <motion.div 
                    key={i}
                    className="absolute inset-0 border-2 border-primary-500/30 rounded-[4rem]"
                    animate={{ scale: [1, 1.4 + i*0.2], opacity: [0.6, 0] }}
                    transition={{ repeat: Infinity, duration: 2, delay: i * 0.6 }}
                  />
                ))}
              </div>

              <div className="text-center space-y-4">
                <motion.p 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="text-primary-400 font-black uppercase tracking-[0.4em] text-[10px]"
                >
                  Incoming {call.type === 'VIDEO' ? 'Video' : 'Audio'} Call
                </motion.p>
                <motion.h2 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="text-4xl font-black text-white tracking-tight"
                >
                  {call.from?.name || 'Unknown User'}
                </motion.h2>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-center space-x-12 pt-12">
                <button 
                  onClick={rejectCall}
                  className="group flex flex-col items-center space-y-4"
                >
                  <div className="w-20 h-20 rounded-[2.5rem] bg-rose-500/10 border-2 border-rose-500/20 text-rose-500 hover:bg-rose-500 hover:text-white transition-all duration-500 flex items-center justify-center shadow-2xl">
                    <XMarkIcon className="w-10 h-10" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-rose-500/80">Reject</span>
                </button>

                <button 
                  onClick={answerCall}
                  className="group flex flex-col items-center space-y-4"
                >
                  <motion.div 
                    animate={{ scale: [1, 1.05, 1], y: [0, -4, 0] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className="w-24 h-24 rounded-[3rem] bg-emerald-500 text-white hover:bg-emerald-600 transition-all duration-500 flex items-center justify-center shadow-[0_25px_50px_-12px_rgba(16,185,129,0.5)] active:scale-90"
                  >
                    <PhoneIcon className="w-12 h-12" />
                  </motion.div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-500">Answer</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Active Call Screen */}
        {callAccepted && !callEnded && (
          <motion.div 
            key="active"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000000] bg-slate-950 flex flex-col items-center justify-center"
          >
            {/* Remote Media */}
            {call.type === 'VIDEO' ? (
              <video 
                playsInline 
                ref={(el) => {
                  if (el && remoteStream) el.srcObject = remoteStream;
                  userVideo.current = el;
                }} 
                autoPlay 
                onLoadedMetadata={(e) => e.target.play().catch(console.error)}
                className="w-full h-full object-cover" 
              />
            ) : (
              <div className="flex flex-col items-center space-y-8">
                {/* Keep video element in DOM and active for audio to play, but invisible */}
                <video playsInline ref={userVideo} autoPlay className="absolute w-0 h-0 opacity-0 pointer-events-none" />
                <div className="w-40 h-40 rounded-full bg-primary-600/10 border-4 border-primary-500/20 flex items-center justify-center relative">
                   <div className="absolute inset-0 rounded-full border-4 border-primary-500/10 animate-ping opacity-30"></div>
                   <div className="absolute inset-4 rounded-full border-2 border-white/20 animate-pulse"></div>
                   <div className="w-28 h-28 rounded-full bg-primary-600 flex items-center justify-center text-white text-5xl font-black border-4 border-white/30 shadow-2xl">
                     {(call.from?.name || call.to?.name)?.charAt(0) || 'U'}
                   </div>
                </div>
                <div className="text-center">
                  <h2 className="text-3xl font-black text-white">{call.from?.name || call.to?.name || 'Active Call'}</h2>
                  <p className="text-primary-400 font-bold uppercase tracking-[0.2em] text-xs mt-3">Secure Connection</p>
                </div>
              </div>
            )}

            {/* Local Floating Video */}
            {call.type === 'VIDEO' && stream && (
              <div className="absolute top-8 right-6 w-32 h-44 rounded-3xl overflow-hidden border-2 border-white/30 shadow-2xl bg-slate-900 ring-4 ring-black/20">
                <video 
                  playsInline 
                  muted 
                  ref={(el) => {
                    if (el && stream) el.srcObject = stream;
                    myVideo.current = el;
                  }} 
                  autoPlay 
                  onLoadedMetadata={(e) => e.target.play().catch(console.error)}
                  className="w-full h-full object-cover -scale-x-100" 
                />
                
                {/* Local Video Off Placeholder */}
                {isVideoOff && (
                  <div className="absolute inset-0 bg-slate-800 flex items-center justify-center">
                    <VideoCameraSlashIcon className="w-8 h-8 text-white/20" />
                  </div>
                )}
              </div>
            )}

            {/* Controls */}
            <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex items-center space-x-6 p-6 px-10 bg-white/5 backdrop-blur-3xl rounded-[3rem] border border-white/10 shadow-2xl">
              <button 
                onClick={toggleMute}
                className={`w-14 h-14 rounded-[2rem] flex items-center justify-center transition-all ${isMuted ? 'bg-rose-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}
              >
                {isMuted ? <MicrophoneIcon className="w-7 h-7" /> : <SpeakerWaveIcon className="w-7 h-7" />}
              </button>
              
              <button 
                onClick={leaveCall}
                className="w-20 h-20 rounded-[2.5rem] bg-rose-600 text-white shadow-2xl shadow-rose-600/40 hover:bg-rose-700 hover:scale-110 active:scale-95 transition-all flex items-center justify-center"
              >
                <PhoneIcon className="w-9 h-9 rotate-[135deg]" />
              </button>

              {call.type === 'VIDEO' && (
                <button 
                  onClick={toggleVideo}
                  className={`w-14 h-14 rounded-[2rem] flex items-center justify-center transition-all ${isVideoOff ? 'bg-rose-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}
                >
                  {isVideoOff ? <VideoCameraSlashIcon className="w-7 h-7" /> : <VideoCameraIcon className="w-7 h-7" />}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
