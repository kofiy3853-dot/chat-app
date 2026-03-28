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

  // Reactive stream syncing to ensure video/audio elements always have the track
  useEffect(() => {
    if (callAccepted && !callEnded) {
      if (userVideo.current && remoteStream) {
        userVideo.current.srcObject = remoteStream;
      }
      if (myVideo.current && stream) {
        myVideo.current.srcObject = stream;
      }
    }
  }, [callAccepted, callEnded, remoteStream, stream]);

  return (
    <AnimatePresence>
      {/* Outgoing call (Caller's 'Calling...' screen) */}
      {call.isCalling && !callAccepted && (
        <motion.div
          key="outgoing"
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          className="fixed top-20 left-1/2 -translate-x-1/2 z-[10000] w-[85%] max-w-xs"
        >
          <div className="bg-white border-2 border-emerald-500 p-4 rounded-3xl shadow-[0_20px_50px_rgba(16,185,129,0.3)] flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-11 h-11 rounded-2xl bg-emerald-600 flex items-center justify-center text-white text-lg font-black animate-pulse shadow-lg shadow-emerald-600/20">
                {call.to?.name?.charAt(0)}
              </div>
              <div>
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest leading-none mb-1">Calling...</p>
                <h3 className="text-base font-black text-slate-900 leading-tight">{call.to?.name}</h3>
              </div>
            </div>
            <button
              onClick={leaveCall}
              className="w-10 h-10 rounded-xl bg-red-100 text-red-600 hover:bg-red-600 hover:text-white transition-all flex items-center justify-center shadow-lg"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
        </motion.div>
      )}

      {/* Incoming Call UI */}
      {call.isReceivingCall && !callAccepted && (
        <motion.div 
          key="incoming"
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          className="fixed top-20 left-1/2 -translate-x-1/2 z-[10000] w-[85%] max-w-xs"
        >
          <div className="bg-white border-2 border-primary-500 p-4 rounded-3xl shadow-[0_20px_50px_rgba(37,99,235,0.3)] flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-11 h-11 rounded-2xl bg-primary-600 flex items-center justify-center text-white text-lg font-black shadow-lg shadow-primary-600/20">
                {call.from?.name?.charAt(0)}
              </div>
              <div>
                <p className="text-[10px] font-black text-primary-600 uppercase tracking-widest leading-none mb-1">Incoming Call</p>
                <h3 className="text-base font-black text-slate-900 leading-tight">{call.from?.name}</h3>
              </div>
            </div>
            <div className="flex space-x-2">
              <button 
                onClick={rejectCall}
                className="w-10 h-10 rounded-xl bg-red-100 text-red-600 hover:bg-red-600 hover:text-white transition-all flex items-center justify-center shadow-sm"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
              <button 
                onClick={answerCall}
                className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all flex items-center justify-center animate-bounce shadow-md shadow-emerald-600/20"
              >
                <PhoneIcon className="w-6 h-6" />
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
          className="fixed inset-0 z-[100] bg-slate-900 flex flex-col items-center justify-center"
        >
          {/* Remote Media */}
          {call.type === 'VIDEO' ? (
            <video playsInline ref={userVideo} autoPlay className="w-full h-full object-cover" />
          ) : (
            <div className="flex flex-col items-center space-y-6">
              <video playsInline ref={userVideo} autoPlay className="hidden" />
              <div className="w-32 h-32 rounded-full bg-primary-600/20 border-2 border-primary-500 flex items-center justify-center relative">
                 <div className="absolute inset-0 rounded-full border-4 border-white animate-ping opacity-20"></div>
                 <div className="w-24 h-24 rounded-full bg-primary-600 flex items-center justify-center text-white text-4xl font-bold border-4 border-white shadow-xl">
                   {(call.from?.name || call.to?.name)?.charAt(0) || 'U'}
                 </div>
              </div>
              <div className="text-center">
                <h2 className="text-2xl font-black text-white">{call.from?.name || call.to?.name || 'In Call'}</h2>
                <p className="text-primary-400 font-bold uppercase tracking-widest text-sm mt-2">Active Voice Call</p>
              </div>
            </div>
          )}

          {/* Local Floating Video */}
          {call.type === 'VIDEO' && stream && (
            <div className="absolute bottom-32 right-6 w-32 h-44 rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl bg-black">
              <video playsInline muted ref={myVideo} autoPlay className="w-full h-full object-cover" />
            </div>
          )}

          {/* Controls */}
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center space-x-6 p-6 px-8 bg-white/10 backdrop-blur-2xl rounded-full border border-white/10 shadow-2xl">
            <button 
              onClick={toggleMute}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isMuted ? 'bg-red-500 text-white' : 'bg-white/20 text-white hover:bg-white/40'}`}
            >
              {isMuted ? <MicrophoneIcon className="w-6 h-6" /> : <SpeakerWaveIcon className="w-6 h-6" />}
            </button>
            
            <button 
              onClick={leaveCall}
              className="w-16 h-16 rounded-full bg-red-600 text-white shadow-xl shadow-red-600/40 hover:bg-red-700 hover:scale-110 active:scale-95 transition-all flex items-center justify-center"
            >
              <PhoneIcon className="w-8 h-8 rotate-[135deg]" />
            </button>

            {call.type === 'VIDEO' && (
              <button 
                onClick={toggleVideo}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isVideoOff ? 'bg-red-500 text-white' : 'bg-white/20 text-white hover:bg-white/40'}`}
              >
                {isVideoOff ? <VideoCameraSlashIcon className="w-6 h-6" /> : <VideoCameraIcon className="w-6 h-6" />}
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
