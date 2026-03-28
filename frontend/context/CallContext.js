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
  const connectionRef = useRef();
  const streamRef = useRef(null);
  const pendingCandidates = useRef([]);
  const callTargetId = useRef(null);

  // Socket listeners
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const onIncomingCall = ({ from, offer, type }) => {
      console.log('[WebRTC] Incoming call from:', from.name);
      if (connectionRef.current) {
        socket.emit('reject-call', { targetUserId: from.id });
        return;
      }
      callTargetId.current = from.id;
      setCall({ isReceivingCall: true, from, offer, type });
      ringtoneRef.current?.play().catch(e => console.log('[WebRTC] Ringtone blocked', e));
    };

    const onCallEnded = () => {
      console.log('[WebRTC] Call ended by remote');
      handleCleanup();
    };

    const onCallRejected = () => {
      console.log('[WebRTC] Call rejected by remote');
      handleCleanup();
      alert('Call rejected or user busy');
    };

    socket.on('incoming-call', onIncomingCall);
    socket.on('call-ended', onCallEnded);
    socket.on('call-rejected', onCallRejected);

    return () => {
      socket.off('incoming-call', onIncomingCall);
      socket.off('call-ended', onCallEnded);
      socket.off('call-rejected', onCallRejected);
    };
  }, []);

  const handleCleanup = () => {
    const socket = getSocket();
    if (socket) {
      socket.off('ice-candidate');
      socket.off('call-accepted');
    }

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
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      console.log('[WebRTC] Local stream acquired. Tracks:', localStream.getTracks().map(t => t.kind));
    } catch (err) {
      console.error('[WebRTC] getUserMedia error:', err);
      alert('Could not access microphone/camera.');
      handleCleanup();
      return;
    }
    
    streamRef.current = localStream;
    setStream(localStream);

    // Accept AFTER stream is ready — so CallInterface renders with stream already set
    setCallAccepted(true);

    if (myVideo.current) {
      myVideo.current.srcObject = localStream;
      myVideo.current.muted = true;
    }

    const iceConfig = await getIceServers();
    const peer = new RTCPeerConnection(iceConfig);

    peer.onconnectionstatechange = () => {
      console.log('[WebRTC] Connection state:', peer.connectionState);
      if (peer.connectionState === 'failed') {
        console.warn('[WebRTC] Connection failed — attempting ICE restart...');
        // Attempt ICE restart before giving up
        if (peer.signalingState !== 'closed') {
          peer.restartIce();
          // Give it 8 seconds to recover, then clean up
          setTimeout(() => {
            if (connectionRef.current && 
               (connectionRef.current.connectionState === 'failed' ||
                connectionRef.current.connectionState === 'disconnected')) {
              console.error('[WebRTC] ICE restart failed. Ending call.');
              handleCleanup();
            }
          }, 8000);
        } else {
          handleCleanup();
        }
      } else if (peer.connectionState === 'disconnected') {
        console.warn('[WebRTC] Disconnected — waiting before cleanup...');
        setTimeout(() => {
          if (connectionRef.current?.connectionState === 'disconnected') {
            handleCleanup();
          }
        }, 5000);
      }
    };

    peer.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('[WebRTC] Gathered ICE candidate type:', event.candidate.type, event.candidate.protocol);
        socket.emit('ice-candidate', { 
          targetUserId: call.from.id, 
          candidate: event.candidate 
        });
      } else {
        console.log('[WebRTC] ICE gathering complete');
      }
    };

    peer.ontrack = (event) => {
      console.log('[WebRTC] Remote track detected:', event.track.kind);
      // More robust way to handle remote stream
      if (event.streams && event.streams[0]) {
        console.log('[WebRTC] Using remote stream from event');
        setRemoteStream(event.streams[0]);
        if (userVideo.current) {
          userVideo.current.srcObject = event.streams[0];
        }
      } else {
        console.log('[WebRTC] Creating new MediaStream for track');
        setRemoteStream(prev => {
          const newStream = prev || new MediaStream();
          newStream.addTrack(event.track);
          if (userVideo.current) {
            userVideo.current.srcObject = newStream;
          }
          return newStream;
        });
      }

      // Important: Force play the remote media element
      setTimeout(() => {
        if (userVideo.current) {
          userVideo.current.play().catch(err => console.error('[WebRTC] Remote playback failed:', err));
        }
      }, 500);
    };

    localStream.getTracks().forEach((track) => {
      console.log('[WebRTC] Adding local track to peer:', track.kind);
      peer.addTrack(track, localStream);
    });

    try {
      await peer.setRemoteDescription(new RTCSessionDescription(call.offer));
      console.log('[WebRTC] Remote offer set');

      for (const c of pendingCandidates.current) {
        await peer.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
      }
      pendingCandidates.current = [];

      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      console.log('[WebRTC] Local answer set');

      socket.emit('answer-call', { targetUserId: call.from.id, answer });
    } catch (error) {
      console.error('[WebRTC] Answer flow error:', error);
      handleCleanup();
    }

    socket.off('ice-candidate');
    socket.on('ice-candidate', ({ candidate }) => {
      if (peer.remoteDescription) {
        peer.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
      } else {
        pendingCandidates.current.push(candidate);
      }
    });

    connectionRef.current = peer;
  };

  const callUser = async (id, userName, type) => {
    console.log('[WebRTC] Calling:', userName);
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
      console.log('[WebRTC] Caller stream acquired. Tracks:', localStream.getTracks().map(t => t.kind));
    } catch (err) {
      console.error('[WebRTC] getUserMedia error:', err);
      alert('Could not access microphone/camera.');
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

    const iceConfig = await getIceServers();
    const peer = new RTCPeerConnection(iceConfig);

    peer.onconnectionstatechange = () => {
      console.log('[WebRTC] Connection state:', peer.connectionState);
      if (peer.connectionState === 'disconnected' || peer.connectionState === 'failed') {
        handleCleanup();
      }
    };

    peer.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('ice-candidate', { targetUserId: id, candidate: event.candidate });
      }
    };

    peer.ontrack = (event) => {
      console.log('[WebRTC] Remote track detected:', event.track.kind);
      if (event.streams && event.streams[0]) {
        console.log('[WebRTC] Using remote stream from event');
        setRemoteStream(event.streams[0]);
        if (userVideo.current) {
          userVideo.current.srcObject = event.streams[0];
        }
      } else {
        console.log('[WebRTC] Creating new MediaStream for track');
        setRemoteStream(prev => {
          const newStream = prev || new MediaStream();
          newStream.addTrack(event.track);
          if (userVideo.current) {
            userVideo.current.srcObject = newStream;
          }
          return newStream;
        });
      }

      setTimeout(() => {
        if (userVideo.current) {
          userVideo.current.play().catch(err => console.error('[WebRTC] Remote playback failed:', err));
        }
      }, 500);
    };

    localStream.getTracks().forEach((track) => {
      console.log('[WebRTC] Adding local track to peer:', track.kind);
      peer.addTrack(track, localStream);
    });

    try {
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      console.log('[WebRTC] Local offer set');

      socket.emit('call-user', {
        targetUserId: id,
        offer: offer,
        from: { id: currentUser.id, name: currentUser.name },
        type
      });
    } catch (error) {
      console.error('[WebRTC] Offer flow error:', error);
      handleCleanup();
    }

    socket.off('call-accepted');
    socket.on('call-accepted', async ({ answer }) => {
      console.log('[WebRTC] Call accepted');
      setCallAccepted(true);
      try {
        await peer.setRemoteDescription(new RTCSessionDescription(answer));
        for (const c of pendingCandidates.current) {
          await peer.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
        }
        pendingCandidates.current = [];
      } catch (err) {
        console.error('[WebRTC] Remote answer error:', err);
      }
    });

    socket.off('ice-candidate');
    socket.on('ice-candidate', ({ candidate }) => {
      if (peer.remoteDescription) {
        peer.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
      } else {
        pendingCandidates.current.push(candidate);
      }
    });

    connectionRef.current = peer;
  };

  const leaveCall = () => {
    const socket = getSocket();
    const targetId = callTargetId.current;
    if (socket && targetId) {
      // If we are the ones who started the call and it wasn't accepted yet, mark it as missed for the receiver
      if (call.isCalling && !callAccepted) {
        socket.emit('missed-call', { targetUserId: targetId, type: call.type });
      }
      socket.emit('end-call', { targetUserId: targetId });
    }
    handleCleanup();
  };

  const rejectCall = () => {
    const socket = getSocket();
    if (call.from?.id) {
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
