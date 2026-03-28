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
      setCall({ isReceivingCall: true, from, offer, type });
    });

    socket.on('call-ended', () => {
      setCallEnded(true);
      if (connectionRef.current) {
        connectionRef.current.close();
      }
      window.location.reload(); // Quick reset
    });

    return () => {
      socket.off('incoming-call');
      socket.off('call-ended');
    };
  }, []);

  const answerCall = async () => {
    setCallAccepted(true);
    const socket = getSocket();
    
    const localStream = await navigator.mediaDevices.getUserMedia({ 
      video: call.type === 'VIDEO', 
      audio: true 
    });
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

    socket.on('ice-candidate', ({ candidate }) => {
      peer.addIceCandidate(new RTCIceCandidate(candidate));
    });

    connectionRef.current = peer;
  };

  const callUser = async (id, userName, type) => {
    const socket = getSocket();
    const currentUser = getCurrentUser();

    const localStream = await navigator.mediaDevices.getUserMedia({ 
      video: type === 'VIDEO', 
      audio: true 
    });
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

    socket.on('call-accepted', ({ answer }) => {
      setCallAccepted(true);
      peer.setRemoteDescription(new RTCSessionDescription(answer));
    });

    socket.on('ice-candidate', ({ candidate }) => {
      peer.addIceCandidate(new RTCIceCandidate(candidate));
    });
    
    socket.on('call-rejected', () => {
      alert('Call rejected');
      leaveCall();
    });

    connectionRef.current = peer;
  };

  const leaveCall = () => {
    setCallEnded(true);
    if (connectionRef.current) {
      connectionRef.current.close();
    }
    
    const socket = getSocket();
    const targetId = call.from?.id;
    if (socket && targetId) {
      socket.emit('end-call', { targetUserId: targetId });
    }

    window.location.reload();
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
