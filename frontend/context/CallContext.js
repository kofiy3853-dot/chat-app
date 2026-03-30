import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { getSocket } from '../services/socket';
import { getCurrentUser } from '../utils/helpers';

const CallContext = createContext(null);

export const useCall = () => useContext(CallContext);

// Fetch fresh ICE server config from backend (uses Metered TURN when configured)
const getIceServers = async () => {
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000'}/api/turn/credentials`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) throw new Error('TURN fetch failed');
    const data = await res.json();
    console.log('[WebRTC] ICE servers loaded:', data.iceServers?.length, 'entries');
    return { iceServers: data.iceServers, iceCandidatePoolSize: 10 };
  } catch (err) {
    console.warn('[WebRTC] Could not fetch TURN credentials, using fallback STUN only:', err.message);
    return {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
      iceCandidatePoolSize: 10,
    };
  }
};

export const CallProvider = ({ children }) => {
  const [call, setCall] = useState({});
  const [callAccepted, setCallAccepted] = useState(false);
  const [callEnded, setCallEnded] = useState(false);
  const [stream, setStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const ringtoneRef = useRef(null);

  useEffect(() => {
    // Initialize ringtone
    ringtoneRef.current = new Audio('https://cdnjs.cloudflare.com/ajax/libs/ion-sound/3.0.7/sounds/bell_ring.mp3');
    ringtoneRef.current.loop = true;
  }, []);

  const myVideo = useRef();
  const userVideo = useRef();
  const connectionRef = useRef(null);
  const streamRef = useRef(null);
  const pendingCandidates = useRef([]);
  const callTargetId = useRef(null);

  const handleCleanup = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        console.log('[WebRTC] Stopping local track:', track.kind);
        track.stop();
      });
      streamRef.current = null;
    }
    if (connectionRef.current) {
      connectionRef.current.close();
      connectionRef.current = null;
    }
    pendingCandidates.current = [];
    callTargetId.current = null;
    if (ringtoneRef.current) {
      ringtoneRef.current.pause();
      ringtoneRef.current.currentTime = 0;
    }
    setStream(null);
    setRemoteStream(null);
    setCall({});
    setCallAccepted(false);
    setCallEnded(false);
    setIsMuted(false);
    setIsVideoOff(false);
    console.log('[WebRTC] Cleanup finished');
  };

  useEffect(() => {
    let socket = null;
    const bindSocketListeners = () => {
       socket = getSocket();
       if (!socket) return false;
       
       console.log('[WebRTC] Socket found, binding listeners');
       
       socket.on('incoming-call', ({ from, offer, type }) => {
         console.log('[WebRTC] Incoming call from:', from.name, '| Type:', type);
         if (connectionRef.current) {
           console.log('[WebRTC] Busy — rejecting incoming call');
           socket.emit('reject-call', { targetUserId: from.id });
           return;
         }
         callTargetId.current = from.id;
         setCall({ isReceivingCall: true, from, offer, type });
         ringtoneRef.current?.play().catch(e => console.log('[WebRTC] Ringtone blocked', e));
       });

       socket.on('call-accepted', async ({ answer }) => {
         console.log('[WebRTC] Call accepted by remote');
         setCallAccepted(true);
         const peer = connectionRef.current;
         if (peer && peer.signalingState === 'have-local-offer') {
           try {
             await peer.setRemoteDescription(new RTCSessionDescription(answer));
             console.log('[WebRTC] Remote answer set successfully');
             while (pendingCandidates.current.length > 0) {
               const candidate = pendingCandidates.current.shift();
               await peer.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
             }
           } catch (err) { console.error('[WebRTC] Error setting remote answer:', err); }
         }
       });

       socket.on('ice-candidate', async ({ candidate }) => {
         const peer = connectionRef.current;
         if (peer && peer.remoteDescription && peer.remoteDescription.type) {
           await peer.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
         } else {
           pendingCandidates.current.push(candidate);
         }
       });

       socket.on('call-rejected', () => { handleCleanup(); alert('Call rejected or busy'); });
       socket.on('call-ended', () => { handleCleanup(); });

       return true;
    };

    if (!bindSocketListeners()) {
      const socketCheckInterval = setInterval(() => {
        if (bindSocketListeners()) clearInterval(socketCheckInterval);
      }, 1000);
      return () => {
        clearInterval(socketCheckInterval);
        if (socket) {
          socket.off('incoming-call');
          socket.off('call-accepted');
          socket.off('ice-candidate');
          socket.off('call-rejected');
          socket.off('call-ended');
        }
      };
    }

    return () => {
      if (socket) {
        socket.off('incoming-call');
        socket.off('call-accepted');
        socket.off('ice-candidate');
        socket.off('call-rejected');
        socket.off('call-ended');
      }
    };
  }, []);

  const answerCall = async () => {
    console.log('[WebRTC] Answering call...');
    const socket = getSocket();
    if (ringtoneRef.current) {
      ringtoneRef.current.pause();
      ringtoneRef.current.currentTime = 0;
    }

    let localStream;
    try {
      localStream = await navigator.mediaDevices.getUserMedia({ 
        video: call.type === 'VIDEO', 
        audio: true 
      });
      streamRef.current = localStream;
      setStream(localStream);
      setCallAccepted(true);
    } catch (err) {
      console.error('[WebRTC] Media access error:', err);
      alert('Could not access microphone/camera.');
      rejectCall();
      return;
    }

    const iceConfig = await getIceServers();
    const peer = new RTCPeerConnection(iceConfig);
    connectionRef.current = peer;

    peer.onicecandidate = (e) => {
      if (e.candidate) {
        socket.emit('ice-candidate', { targetUserId: call.from.id, candidate: e.candidate });
      }
    };

    peer.ontrack = (e) => {
      console.log('[WebRTC] Remote track received:', e.track.kind);
      setRemoteStream(e.streams[0]);
    };

    localStream.getTracks().forEach(track => peer.addTrack(track, localStream));

    try {
      await peer.setRemoteDescription(new RTCSessionDescription(call.offer));
      // Process candidates that arrived before offer was set
      while (pendingCandidates.current.length > 0) {
        const c = pendingCandidates.current.shift();
        await peer.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
      }
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      socket.emit('answer-call', { targetUserId: call.from.id, answer });
    } catch (err) {
      console.error('[WebRTC] Answer sequence error:', err);
      handleCleanup();
    }
  };

  const callUser = async (id, userName, type) => {
    console.log('[WebRTC] Initiating call to:', userName);
    const socket = getSocket();
    const currentUser = getCurrentUser();

    let localStream;
    try {
      localStream = await navigator.mediaDevices.getUserMedia({ 
        video: type === 'VIDEO', 
        audio: true 
      });
      streamRef.current = localStream;
      setStream(localStream);
    } catch (err) {
      console.error('[WebRTC] Media access error:', err);
      alert('Permission denied or device not found.');
      return;
    }

    const iceConfig = await getIceServers();
    const peer = new RTCPeerConnection(iceConfig);
    connectionRef.current = peer;

    peer.onicecandidate = (e) => {
      if (e.candidate) {
        socket.emit('ice-candidate', { targetUserId: id, candidate: e.candidate });
      }
    };

    peer.ontrack = (e) => {
      console.log('[WebRTC] Remote track received:', e.track.kind);
      setRemoteStream(e.streams[0]);
    };

    localStream.getTracks().forEach(track => peer.addTrack(track, localStream));

    try {
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      setCall({ isCalling: true, to: { id, name: userName }, type });
      callTargetId.current = id;
      socket.emit('call-user', { targetUserId: id, offer, from: { id: currentUser.id, name: currentUser.name }, type });
    } catch (err) {
      console.error('[WebRTC] Offer sequence error:', err);
      handleCleanup();
    }
  };

  const leaveCall = () => {
    const socket = getSocket();
    if (socket && callTargetId.current) {
      socket.emit('end-call', { targetUserId: callTargetId.current });
    }
    handleCleanup();
  };

  const rejectCall = () => {
    const socket = getSocket();
    if (socket && call.from?.id) {
      socket.emit('reject-call', { targetUserId: call.from.id });
    }
    handleCleanup();
  };

  const toggleMute = () => {
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
        console.log('[WebRTC] Local audio muted:', !audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
        console.log('[WebRTC] Local video off:', !videoTrack.enabled);
      }
    }
  };

  return (
    <CallContext.Provider value={{
      call, callAccepted, myVideo, userVideo, stream, remoteStream, callEnded,
      callUser, leaveCall, answerCall, rejectCall, toggleMute, toggleVideo, isMuted, isVideoOff
    }}>
      {children}
    </CallContext.Provider>
  );
};
