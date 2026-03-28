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

  const myVideo = useRef();
  const userVideo = useRef();
  const connectionRef = useRef();

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    socket.on('incoming-call', ({ from, offer, type }) => {
      // Don't show incoming call if already in a call
      if (call.isReceivingCall || callAccepted) {
        socket.emit('reject-call', { targetUserId: from.id });
        return;
      }
      setCall({ isReceivingCall: true, from, offer, type });
    });

    socket.on('call-ended', () => {
      handleCleanup();
    });

    socket.on('call-rejected', () => {
      alert('Call rejected or user busy');
      handleCleanup();
    });

    return () => {
      socket.off('incoming-call');
      socket.off('call-ended');
      socket.off('call-rejected');
    };
  }, [call, callAccepted]);

  const handleCleanup = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    if (connectionRef.current) {
      connectionRef.current.close();
      connectionRef.current = null;
    }
    setStream(null);
    setRemoteStream(null);
    setCall({});
    setCallAccepted(false);
    setCallEnded(false);
    setIsMuted(false);
    setIsVideoOff(false);
  };

  const answerCall = async () => {
    setCallAccepted(true);
    const socket = getSocket();
    
    let localStream;
    try {
      localStream = await navigator.mediaDevices.getUserMedia({ 
        video: call.type === 'VIDEO', 
        audio: true 
      });
    } catch (err) {
      console.error('Media access error:', err);
      alert('Could not access camera or microphone. Please check permissions.');
      return;
    }
    
    setStream(localStream);
    if (myVideo.current) myVideo.current.srcObject = localStream;

    const peer = new RTCPeerConnection(servers);

    peer.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('ice-candidate', { 
          targetUserId: call.from.id, 
          candidate: event.candidate 
        });
      }
    };

    peer.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
      if (userVideo.current) userVideo.current.srcObject = event.streams[0];
    };

    localStream.getTracks().forEach((track) => {
      peer.addTrack(track, localStream);
    });

    await peer.setRemoteDescription(new RTCSessionDescription(call.offer));
    const answer = await peer.createAnswer();
    await peer.setLocalDescription(answer);

    socket.emit('answer-call', { targetUserId: call.from.id, answer });

    socket.off('ice-candidate'); // Clear any previous listener
    socket.on('ice-candidate', ({ candidate }) => {
      if (peer.remoteDescription) {
        peer.addIceCandidate(new RTCIceCandidate(candidate));
      }
    });

    connectionRef.current = peer;
  };

  const callUser = async (id, userName, type) => {
    const socket = getSocket();
    const currentUser = getCurrentUser();

    let localStream;
    try {
      localStream = await navigator.mediaDevices.getUserMedia({ 
        video: type === 'VIDEO', 
        audio: true 
      });
    } catch (err) {
      console.error('Media access error:', err);
      alert('Could not access camera or microphone. Please check permissions.');
      return;
    }
    
    setStream(localStream);
    if (myVideo.current) myVideo.current.srcObject = localStream;

    const peer = new RTCPeerConnection(servers);

    peer.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('ice-candidate', { 
          targetUserId: id, 
          candidate: event.candidate 
        });
      }
    };

    peer.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
      if (userVideo.current) userVideo.current.srcObject = event.streams[0];
    };

    localStream.getTracks().forEach((track) => {
      peer.addTrack(track, localStream);
    });

    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);

    socket.emit('call-user', {
      targetUserId: id,
      offer: offer,
      from: { id: currentUser.id, name: currentUser.name, avatar: currentUser.avatar },
      type
    });

    socket.off('call-accepted');
    socket.on('call-accepted', ({ answer }) => {
      setCallAccepted(true);
      peer.setRemoteDescription(new RTCSessionDescription(answer));
    });

    socket.off('ice-candidate');
    socket.on('ice-candidate', ({ candidate }) => {
      if (peer.remoteDescription) {
        peer.addIceCandidate(new RTCIceCandidate(candidate));
      }
    });

    connectionRef.current = peer;
  };

  const leaveCall = () => {
    const socket = getSocket();
    const targetId = call.from?.id;
    if (socket && targetId) {
      socket.emit('end-call', { targetUserId: targetId });
    }

    handleCleanup();
  };

  const rejectCall = () => {
    const socket = getSocket();
    socket.emit('reject-call', { targetUserId: call.from.id });
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
