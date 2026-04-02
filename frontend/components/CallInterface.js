import React, { useEffect, useRef } from 'react';
import { useCall } from '../context/CallContext';
import { 
  PhoneIcon, 
  VideoCameraIcon, 
  XMarkIcon, 
  MicrophoneIcon, 
  SpeakerWaveIcon,
  VideoCameraSlashIcon
} from '@heroicons/react/24/outline';
import { KeepAwake } from '@capacitor-community/keep-awake';

export default function CallInterface() {
  const { 
    call, 
    callAccepted, 
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

  const myVideoRef = useRef(null);
  const userVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);
  
  // Attach local stream to myVideoRef
  useEffect(() => {
    if (myVideoRef.current && stream) {
      console.log('[CallInterface] Attaching local stream');
      myVideoRef.current.srcObject = stream;
    }
  }, [stream, callAccepted]);

  // Attach remote stream to userVideoRef
  useEffect(() => {
    if (userVideoRef.current && remoteStream) {
      console.log('[CallInterface] Attaching remote stream');
      userVideoRef.current.srcObject = remoteStream;
      userVideoRef.current.play().catch(e => console.warn('[CallInterface] Remote play error:', e));

      // Workaround for some mobile browsers to ensure audio plays
      // Ensuring only ONE audio object exists to prevent echo/double audio (Previous bug)
      if (!remoteAudioRef.current) {
        remoteAudioRef.current = new Audio();
        remoteAudioRef.current.playsInline = true;
        remoteAudioRef.current.autoplay = true;
      }
      
      if (remoteAudioRef.current.srcObject !== remoteStream) {
        remoteAudioRef.current.srcObject = remoteStream;
        remoteAudioRef.current.muted = false;
        remoteAudioRef.current.play().catch(e => console.warn('[CallInterface] Native audio play error:', e));
      }
    }

    return () => {
      if (remoteAudioRef.current) {
        console.log('[CallInterface] Stopping remote audio');
        remoteAudioRef.current.pause();
        remoteAudioRef.current.srcObject = null;
        remoteAudioRef.current = null;
      }
    };
  }, [remoteStream, callAccepted]);

  useEffect(() => {
    let wakeLock = null;
    const isActive = callAccepted && !callEnded;

    const enableKeepAwake = async () => {
      if (!isActive) return;
      try {
        if (typeof window !== 'undefined' && window.capacitor) {
          await KeepAwake.keepAwake();
        } else if ('wakeLock' in navigator) {
          wakeLock = await navigator.wakeLock.request('screen');
        }
      } catch (e) { console.log('KeepAwake error:', e); }
    };

    const disableKeepAwake = async () => {
      try {
        if (typeof window !== 'undefined' && window.capacitor) {
          await KeepAwake.allowSleep();
        } else if (wakeLock) {
          await wakeLock.release();
          wakeLock = null;
        }
      } catch (e) { console.log('Release error:', e); }
    };

    const handleVisibilityChange = async () => {
      if (typeof window === 'undefined' || (window.capacitor)) return;
      if (isActive && document.visibilityState === 'visible' && 'wakeLock' in navigator && !wakeLock) {
        enableKeepAwake();
      }
    };

    if (isActive) {
      enableKeepAwake();
      document.addEventListener('visibilitychange', handleVisibilityChange);
    } else {
      disableKeepAwake();
    }

    return () => {
      disableKeepAwake();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [callAccepted, callEnded]);

  return (
    <>
      {/* Outgoing call (Caller's 'Calling...' screen) */}
      {call.isCalling && !callAccepted && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[999999] w-[90%] max-w-sm pointer-events-auto">
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
        </div>
      )}

      {/* Incoming Call UI */}
      {call.isReceivingCall && !callAccepted && (
        <div className="fixed inset-0 z-[1000001] bg-slate-900/90 [backdrop-filter:blur(30px)] flex flex-col items-center justify-center p-6">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-primary-600/30 rounded-full blur-[100px] animate-pulse"></div>
          
          <div className="flex flex-col items-center space-y-12 relative z-10 w-full max-w-sm">
            <div className="relative">
              <div className="w-44 h-44 rounded-[4rem] bg-white/10 border-2 border-white/20 flex items-center justify-center shadow-2xl overflow-hidden">
                <div className="w-40 h-40 rounded-[3.5rem] bg-gradient-to-tr from-primary-600 to-indigo-500 flex items-center justify-center text-white text-7xl font-black shadow-inner">
                  {call.from?.name?.charAt(0) || '?'}
                </div>
              </div>
              <div className="absolute inset-0 border-2 border-primary-500/30 rounded-[4rem] animate-ping opacity-30"></div>
              <div className="absolute inset-0 border-2 border-primary-500/20 rounded-[4rem] animate-ping opacity-20" style={{animationDelay: '0.6s'}}></div>
              <div className="absolute inset-0 border-2 border-primary-500/10 rounded-[4rem] animate-ping opacity-10" style={{animationDelay: '1.2s'}}></div>
            </div>

            <div className="text-center space-y-4">
              <p className="text-primary-400 font-black uppercase tracking-[0.4em] text-[10px]">
                Incoming {call.type === 'VIDEO' ? 'Video' : 'Audio'} Call
              </p>
              <h2 className="text-4xl font-black text-white tracking-tight">
                {call.from?.name || 'Unknown User'}
              </h2>
            </div>

            <div className="flex items-center justify-center space-x-12 pt-12">
              <button onClick={rejectCall} className="group flex flex-col items-center space-y-4">
                <div className="w-20 h-20 rounded-[2.5rem] bg-rose-500/10 border-2 border-rose-500/20 text-rose-500 hover:bg-rose-500 hover:text-white transition-all duration-500 flex items-center justify-center shadow-2xl">
                  <XMarkIcon className="w-10 h-10" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-rose-500/80">Reject</span>
              </button>

              <button onClick={answerCall} className="group flex flex-col items-center space-y-4">
                <div className="w-24 h-24 rounded-[3rem] bg-emerald-500 text-white hover:bg-emerald-600 transition-all duration-500 flex items-center justify-center shadow-[0_25px_50px_-12px_rgba(16,185,129,0.5)] active:scale-90 animate-bounce">
                  <PhoneIcon className="w-12 h-12" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-500">Answer</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active Call Screen */}
      {callAccepted && !callEnded && (
        <div className="fixed inset-0 z-[1000000] bg-slate-950 flex flex-col items-center justify-center">
          {call.type === 'VIDEO' ? (
            <video 
              playsInline 
              ref={userVideoRef} 
              autoPlay 
              onLoadedMetadata={(e) => e.target.play().catch(console.error)}
              className="w-full h-full object-cover" 
            />
          ) : (
            <div className="flex flex-col items-center space-y-8">
              <audio 
                ref={userVideoRef} 
                autoPlay 
                playsInline 
                style={{ position: 'absolute', opacity: 0.01, width: '1px', height: '1px', top: '-10px', pointerEvents: 'none' }} 
              />
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

          {call.type === 'VIDEO' && stream && (
            <div className="absolute top-8 right-6 w-32 h-44 rounded-3xl overflow-hidden border-2 border-white/30 shadow-2xl bg-slate-900 ring-4 ring-black/20">
              <video 
                playsInline 
                muted 
                ref={myVideoRef} 
                autoPlay 
                onLoadedMetadata={(e) => e.target.play().catch(console.error)}
                className="w-full h-full object-cover -scale-x-100" 
              />
              {isVideoOff && (
                <div className="absolute inset-0 bg-slate-800 flex items-center justify-center">
                  <VideoCameraSlashIcon className="w-8 h-8 text-white/20" />
                </div>
              )}
            </div>
          )}

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
        </div>
      )}
    </>
  );
}
