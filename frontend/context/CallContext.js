import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { getSocket } from '../services/socket';
import { getCurrentUser } from '../utils/helpers';

const CallContext = createContext(null);

export const useCall = () => useContext(CallContext);

const servers = {
  iceServers: [
    {
      urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
    },
  ],
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
    // Initialize ringtone - Using Cloudflare CDN for reliability
    ringtoneRef.current = new Audio('https://cdnjs.cloudflare.com/ajax/libs/ion-sound/3.0.7/sounds/bell_ring.mp3');
    ringtoneRef.current.loop = true;
    ringtoneRef.current.onerror = (e) => console.log('Ringtone failed to load:', e);
  }, []);

  const myVideo = useRef();
  const userVideo = useRef();
  const connectionRef = useRef();
  const streamRef = useRef(null);       // ref so cleanup always has latest stream
  const pendingCandidates = useRef([]); // queue ICE candidates before remote desc
  const callTargetId = useRef(null);    // tracks who we're calling (both sides)

  // Socket listeners — set up once on mount with stable refs
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const onIncomingCall = ({ from, offer, type }) => {
      // Don't show incoming call if already in a call
      if (connectionRef.current) {
        socket.emit('reject-call', { targetUserId: from.id });
        return;
      }
      callTargetId.current = from.id;
      setCall({ isReceivingCall: true, from, offer, type });
      
      // Start ringtone
      ringtoneRef.current?.play().catch(e => console.log('Ringtone autoplay blocked', e));
    };

    const onCallEnded = () => {
      ringtoneRef.current?.pause();
      if (ringtoneRef.current) ringtoneRef.current.currentTime = 0;
      handleCleanup();
    };

    const onCallRejected = () => {
      ringtoneRef.current?.pause();
      if (ringtoneRef.current) ringtoneRef.current.currentTime = 0;
      alert('Call rejected or user busy');
      handleCleanup();
    };

    socket.on('incoming-call', onIncomingCall);
    socket.on('call-ended', onCallEnded);
    socket.on('call-rejected', onCallRejected);

    return () => {
      socket.off('incoming-call', onIncomingCall);
      socket.off('call-ended', onCallEnded);
      socket.off('call-rejected', onCallRejected);
    };
  }, []); // ✅ Empty deps — never re-registers

  const handleCleanup = () => {
    const socket = getSocket();
    if (socket) {
      socket.off('ice-candidate');
      socket.off('call-accepted');
    }

    // Use ref to always get the latest stream (avoids stale closure bug)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
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
    console.log('[WebRTC] Cleanup complete');
  };

  const answerCall = async () => {
    console.log('[WebRTC] Answering call from:', call.from?.id);
    const socket = getSocket();
    
    // Stop ringtone immediately
    if (ringtoneRef.current) {
      ringtoneRef.current.pause();
      ringtoneRef.current.currentTime = 0;
    }

    setCallAccepted(true);
    
    let localStream;
    try {
      // Robust audio constraints for production
      localStream = await navigator.mediaDevices.getUserMedia({ 
        video: call.type === 'VIDEO', 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      console.log('[WebRTC] Local stream acquired');
    } catch (err) {
      console.error('[WebRTC] Media access error:', err);
      alert('Could not access camera or microphone. Please check permissions.');
      setCallAccepted(false);
      return;
    }
    
    streamRef.current = localStream;
    setStream(localStream);
    if (myVideo.current) {
      myVideo.current.srcObject = localStream;
      myVideo.current.muted = true; // Essential to prevent local echo
    }

    const peer = new RTCPeerConnection(servers);

    // Monitoring connection state
    peer.onconnectionstatechange = () => {
      console.log('[WebRTC] Connection state changed to:', peer.connectionState);
      if (peer.connectionState === 'failed') {
        console.error('[WebRTC] Connection failed. Check network/NAT.');
      }
    };

    peer.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('ice-candidate', { 
          targetUserId: call.from.id, 
          candidate: event.candidate 
        });
      }
    };

    peer.ontrack = (event) => {
      console.log('[WebRTC] Remote track received:', event.track.kind);
      const [remote] = event.streams;
      setRemoteStream(remote);
      
      if (userVideo.current) {
        userVideo.current.srcObject = remote;
        // Explicit play() to handle autopaly restrictions
        userVideo.current.play().catch(e => console.warn('[WebRTC] Auto-play blocked or failed:', e));
      }
    };

    localStream.getTracks().forEach((track) => {
      console.log('[WebRTC] Adding local track:', track.kind);
      peer.addTrack(track, localStream);
    });

    try {
      await peer.setRemoteDescription(new RTCSessionDescription(call.offer));
      console.log('[WebRTC] Remote description (offer) set successfully');

      // Flush candidates
      for (const c of pendingCandidates.current) {
        await peer.addIceCandidate(new RTCIceCandidate(c)).catch(e => console.warn('[WebRTC] Failed to add cached ICE candidate:', e));
      }
      pendingCandidates.current = [];

      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      console.log('[WebRTC] Local description (answer) created and set');

      socket.emit('answer-call', { targetUserId: call.from.id, answer });
    } catch (error) {
      console.error('[WebRTC] Error during answer flow:', error);
      handleCleanup();
    }

    socket.off('ice-candidate');
    socket.on('ice-candidate', ({ candidate }) => {
      if (peer.signalingState === 'closed') return;
      
      if (peer.remoteDescription) {
        peer.addIceCandidate(new RTCIceCandidate(candidate)).catch(err => {
          if (peer.signalingState !== 'closed') console.warn('[WebRTC] ICE candidate error:', err);
        });
      } else {
        pendingCandidates.current.push(candidate);
      }
    });

    connectionRef.current = peer;
  };

  const callUser = async (id, userName, type) => {
    console.log('[WebRTC] Initiating call to:', userName, `(${id})`);
    const socket = getSocket();
    const currentUser = getCurrentUser();

    let localStream;
    try {
      localStream = await navigator.mediaDevices.getUserMedia({ 
        video: type === 'VIDEO', 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      console.log('[WebRTC] Local stream acquired for caller');
    } catch (err) {
      console.error('[WebRTC] Media access error:', err);
      alert('Could not access camera or microphone. Please check permissions.');
      return;
    }
    
    streamRef.current = localStream;
    setStream(localStream);
    if (myVideo.current) {
      myVideo.current.srcObject = localStream;
      myVideo.current.muted = true;
    }

    callTargetId.current = id;
    setCall({ isCalling: true, to: { id, name: userName }, type });

    const peer = new RTCPeerConnection(servers);

    peer.onconnectionstatechange = () => {
      console.log('[WebRTC] Connection state changed to:', peer.connectionState);
    };

    peer.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('ice-candidate', { 
          targetUserId: id, 
          candidate: event.candidate 
        });
      }
    };

    peer.ontrack = (event) => {
      console.log('[WebRTC] Remote track received:', event.track.kind);
      const [remote] = event.streams;
      setRemoteStream(remote);
      if (userVideo.current) {
        userVideo.current.srcObject = remote;
        userVideo.current.play().catch(e => console.warn('[WebRTC] Auto-play blocked or failed:', e));
      }
    };

    localStream.getTracks().forEach((track) => {
      console.log('[WebRTC] Adding local track:', track.kind);
      peer.addTrack(track, localStream);
    });

    try {
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      console.log('[WebRTC] Local description (offer) set for caller');

      socket.emit('call-user', {
        targetUserId: id,
        offer: offer,
        from: { id: currentUser.id, name: currentUser.name, avatar: currentUser.avatar },
        type
      });
    } catch (error) {
      console.error('[WebRTC] Error during call initiation flow:', error);
      handleCleanup();
    }

    socket.off('call-accepted');
    socket.on('call-accepted', async ({ answer }) => {
      console.log('[WebRTC] Call accepted by remote user');
      setCallAccepted(true);
      try {
        await peer.setRemoteDescription(new RTCSessionDescription(answer));
        
        // Flush candidates
        for (const c of pendingCandidates.current) {
          await peer.addIceCandidate(new RTCIceCandidate(c)).catch(e => console.warn('[WebRTC] Failed to add cached ICE candidate:', e));
        }
        pendingCandidates.current = [];
      } catch (err) {
        console.error('[WebRTC] Error setting remote description (answer):', err);
      }
    });

    socket.off('ice-candidate');
    socket.on('ice-candidate', ({ candidate }) => {
      if (peer.signalingState === 'closed') return;

      if (peer.remoteDescription) {
        peer.addIceCandidate(new RTCIceCandidate(candidate)).catch(err => {
          if (peer.signalingState !== 'closed') console.warn('[WebRTC] ICE candidate error:', err);
        });
      } else {
        pendingCandidates.current.push(candidate);
      }
    });

    connectionRef.current = peer;
  };

  const leaveCall = () => {
    const socket = getSocket();
    // ✅ Use ref to correctly get target for BOTH caller and callee
    const targetId = callTargetId.current;
    if (socket && targetId) {
      if (call.isCalling && !callAccepted) {
        socket.emit('missed-call', { targetUserId: targetId, type: call.type });
      }
      socket.emit('end-call', { targetUserId: targetId });
    }
    handleCleanup();
  };

  const rejectCall = () => {
    const socket = getSocket();
    socket.emit('reject-call', { targetUserId: call.from.id });
    // Stop ringtone when rejecting
    if (ringtoneRef.current) {
      ringtoneRef.current.pause();
      ringtoneRef.current.currentTime = 0;
    }
    setCall({});
  };

  const toggleMute = () => {
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      audioTrack.enabled = !audioTrack.enabled;
      setIsMuted(!audioTrack.enabled);
    }
  };

  const toggleVideo = () => {
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  return (
    <CallContext.Provider value={{
      call,
      callAccepted,
      myVideo,
      userVideo,
      stream,
      remoteStream,
      callEnded,
      callUser,
      leaveCall,
      answerCall,
      rejectCall,
      toggleMute,
      toggleVideo,
      isMuted,
      isVideoOff
    }}>
      {children}
    </CallContext.Provider>
  );
};
