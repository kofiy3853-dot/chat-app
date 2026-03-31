import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { getSocket } from '../services/socket';
import { getCurrentUser } from '../utils/helpers';

const CallContext = createContext(null);

export const useCall = () => useContext(CallContext);

/**
 * Fetch fresh ICE server config from backend.
 * Uses fallback STUN only if the backend fetch fails or is not configured.
 */
const getIceServers = async () => {
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) throw new Error('No token for ICE fetch');

    const apiUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';
    const res = await fetch(`${apiUrl}/api/turn/credentials`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (!res.ok) throw new Error('TURN fetch failed');
    const data = await res.json();
    console.log('[WebRTC] ICE servers loaded:', data.iceServers?.length, 'entries');
    return { iceServers: data.iceServers, iceCandidatePoolSize: 10 };
  } catch (err) {
    console.warn('[WebRTC] Using fallback STUN only:', err.message);
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
  const connectionRef = useRef(null);
  const streamRef = useRef(null);
  const pendingCandidates = useRef([]);
  const callTargetId = useRef(null);

  // Initialize ringtone on mount
  useEffect(() => {
    ringtoneRef.current = new Audio('https://cdnjs.cloudflare.com/ajax/libs/ion-sound/3.0.7/sounds/bell_ring.mp3');
    ringtoneRef.current.loop = true;
    
    return () => {
      if (ringtoneRef.current) {
        ringtoneRef.current.pause();
        ringtoneRef.current = null;
      }
    };
  }, []);

  const handleCleanup = () => {
    console.log('[WebRTC] Performing cleanup');
    
    // Stop local tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        console.log('[WebRTC] Stopping local track:', track.kind);
        track.stop();
      });
      streamRef.current = null;
    }

    // Close peer connection
    if (connectionRef.current) {
      connectionRef.current.onicecandidate = null;
      connectionRef.current.ontrack = null;
      connectionRef.current.oniceconnectionstatechange = null;
      connectionRef.current.onsignalingstatechange = null;
      connectionRef.current.close();
      connectionRef.current = null;
    }

    // Stop ringtone
    if (ringtoneRef.current) {
      ringtoneRef.current.pause();
      ringtoneRef.current.currentTime = 0;
    }

    // Reset all state
    pendingCandidates.current = [];
    callTargetId.current = null;
    setStream(null);
    setRemoteStream(null);
    setCall({});
    setCallAccepted(false);
    setCallEnded(true);
    setIsMuted(false);
    setIsVideoOff(false);
    
    setTimeout(() => setCallEnded(false), 2000); // Clear ended state after a short delay
  };

  const processPendingCandidates = async (peer) => {
    if (!peer || !peer.remoteDescription) return;
    
    console.log(`[WebRTC] Processing ${pendingCandidates.current.length} pending candidates`);
    while (pendingCandidates.current.length > 0) {
      const candidate = pendingCandidates.current.shift();
      try {
        await peer.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.warn('[WebRTC] Failed to add pending candidate:', err);
      }
    }
  };

  useEffect(() => {
    let socket = null;
    let intervalId = null;

    const bindListeners = (s) => {
      console.log('[WebRTC] Binding socket listeners');
      
      s.on('incoming-call', ({ from, offer, type }) => {
        console.log('[WebRTC] Incoming call from:', from.name, '| Type:', type);
        if (connectionRef.current) {
          console.log('[WebRTC] System busy, rejecting incoming call');
          s.emit('reject-call', { targetUserId: from.id });
          return;
        }
        callTargetId.current = from.id;
        setCall({ isReceivingCall: true, from, offer, type });
        ringtoneRef.current?.play().catch(e => console.log('[WebRTC] Ringtone blocked by browser', e));
      });

      s.on('call-accepted', async ({ answer }) => {
        console.log('[WebRTC] Remote accepted call');
        const peer = connectionRef.current;
        if (!peer) return;

        try {
          await peer.setRemoteDescription(new RTCSessionDescription(answer));
          setCallAccepted(true);
          await processPendingCandidates(peer);
        } catch (err) {
          console.error('[WebRTC] Error setting remote answer:', err);
        }
      });

      s.on('ice-candidate', async ({ candidate }) => {
        const peer = connectionRef.current;
        if (peer && peer.remoteDescription) {
          try {
            await peer.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (err) {
            console.warn('[WebRTC] Error adding received candidate:', err);
          }
        } else {
          console.log('[WebRTC] Queuing ICE candidate (remote desc not set)');
          pendingCandidates.current.push(candidate);
        }
      });

      s.on('call-rejected', () => {
        console.log('[WebRTC] Call rejected or peer busy');
        handleCleanup();
        alert('The person you called is busy or rejected the call.');
      });

      s.on('call-ended', () => {
        console.log('[WebRTC] Remote peer ended call');
        handleCleanup();
      });
    };

    const unbindListeners = (s) => {
      if (!s) return;
      s.off('incoming-call');
      s.off('call-accepted');
      s.off('ice-candidate');
      s.off('call-rejected');
      s.off('call-ended');
    };

    socket = getSocket();
    if (socket) {
      bindListeners(socket);
    } else {
      // Re-check for socket if it wasn't ready (e.g. waiting for login)
      intervalId = setInterval(() => {
        const s = getSocket();
        if (s) {
          socket = s;
          bindListeners(s);
          clearInterval(intervalId);
        }
      }, 1000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
      unbindListeners(socket);
    };
  }, []);

  const createPeerConnection = async (targetId, currentSocket) => {
    const iceConfig = await getIceServers();
    const peer = new RTCPeerConnection(iceConfig);
    
    peer.onicecandidate = (e) => {
      if (e.candidate) {
        currentSocket.emit('ice-candidate', { targetUserId: targetId, candidate: e.candidate });
      }
    };

    peer.ontrack = (e) => {
      console.log('[WebRTC] Received remote stream track:', e.track.kind);
      if (e.streams && e.streams[0]) {
        setRemoteStream(e.streams[0]);
      }
    };

    peer.oniceconnectionstatechange = () => {
      console.log('[WebRTC] ICE Connection State:', peer.iceConnectionState);
      if (peer.iceConnectionState === 'disconnected' || peer.iceConnectionState === 'failed') {
        handleCleanup();
      }
    };

    return peer;
  };

  const answerCall = async () => {
    console.log('[WebRTC] Answering incoming call...');
    const socket = getSocket();
    if (!socket || !call.from) return;

    if (ringtoneRef.current) {
      ringtoneRef.current.pause();
      ringtoneRef.current.currentTime = 0;
    }

    try {
      const localStream = await navigator.mediaDevices.getUserMedia({ 
        video: call.type === 'VIDEO', 
        audio: true 
      });
      streamRef.current = localStream;
      setStream(localStream);

      const peer = await createPeerConnection(call.from.id, socket);
      connectionRef.current = peer;

      localStream.getTracks().forEach(track => peer.addTrack(track, localStream));

      await peer.setRemoteDescription(new RTCSessionDescription(call.offer));
      setCallAccepted(true);
      
      await processPendingCandidates(peer);

      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);

      socket.emit('answer-call', { targetUserId: call.from.id, answer });
    } catch (err) {
      console.error('[WebRTC] Failed to answer call:', err);
      alert('Could not access camera/microphone or establish connection.');
      handleCleanup();
    }
  };

  const callUser = async (targetUserId, targetUserName, type) => {
    console.log('[WebRTC] Initiating call to:', targetUserName);
    const socket = getSocket();
    const currentUser = getCurrentUser();
    if (!socket || !currentUser) return;

    try {
      const localStream = await navigator.mediaDevices.getUserMedia({ 
        video: type === 'VIDEO', 
        audio: true 
      });
      streamRef.current = localStream;
      setStream(localStream);

      const peer = await createPeerConnection(targetUserId, socket);
      connectionRef.current = peer;

      localStream.getTracks().forEach(track => peer.addTrack(track, localStream));

      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);

      setCall({ isCalling: true, to: { id: targetUserId, name: targetUserName }, type });
      callTargetId.current = targetUserId;

      socket.emit('call-user', { 
        targetUserId, 
        offer, 
        from: { id: currentUser.id, name: currentUser.name }, 
        type 
      });
    } catch (err) {
      console.error('[WebRTC] Failed to initiate call:', err);
      alert('Could not access camera/microphone or failed to create offer.');
      handleCleanup();
    }
  };

  const leaveCall = () => {
    const socket = getSocket();
    const targetId = callTargetId.current || call.from?.id || call.to?.id;
    
    if (socket && targetId) {
      // If we are the caller and we cancel before acceptance, notify the server of a missed call
      if (call.isCalling && !callAccepted) {
        socket.emit('missed-call', { targetUserId: targetId, type: call.type });
      }
      socket.emit('end-call', { targetUserId: targetId });
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
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  return (
    <CallContext.Provider value={{
      call, callAccepted, stream, remoteStream, callEnded,
      callUser, leaveCall, answerCall, rejectCall, toggleMute, toggleVideo, isMuted, isVideoOff
    }}>
      {children}
    </CallContext.Provider>
  );
};

