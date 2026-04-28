import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { PhoneArrowDownLeftIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import { getCurrentUser } from '../../utils/helpers';

export default function GroupCallRoom() {
  const router = useRouter();
  const { cid } = router.query;
  const [user, setUser] = useState(null);
  const [hasPermissions, setHasPermissions] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const usr = getCurrentUser();
    if (!usr) {
      router.push('/login');
    } else {
      setUser(usr);
    }
  }, [router]);

  // Request permissions before loading the iframe for a better UX
  useEffect(() => {
    if (!user || !cid) return;

    const requestPermissions = async () => {
      try {
        await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setHasPermissions(true);
      } catch (err) {
        console.warn('Microphone/Camera permissions denied or not available:', err);
        // Continue anyway, Jitsi handles its own permission requests inside the frame,
        // but getting it early prevents some iframe strict-origin issues.
        setHasPermissions(true); 
      }
    };
    requestPermissions();
  }, [user, cid]);

  useEffect(() => {
    if (!hasPermissions || !containerRef.current || !cid || !user) return;

    // Load Jitsi Meet External API script dynamically
    const script = document.createElement('script');
    script.src = "https://meet.jit.si/external_api.js";
    script.async = true;
    script.onload = () => {
      const domain = 'meet.jit.si';
      const options = {
        roomName: `KTU-CampusChat-${cid}`,
        width: '100%',
        height: '100%',
        parentNode: containerRef.current,
        userInfo: {
          email: user.email || '',
          displayName: user.name || 'KTU Student'
        },
        configOverwrite: {
          startWithAudioMuted: false,
          startWithVideoMuted: true,
          disableDeepLinking: true,
          prejoinPageEnabled: false
        },
        interfaceConfigOverwrite: {
          APP_NAME: 'KTU Campus Chat Call',
          TOOLBAR_BUTTONS: [
            'microphone', 'camera', 'closedcaptions', 'desktop', 'fullscreen',
            'fodeviceselection', 'hangup', 'profile', 'chat', 'settings',
            'videoquality', 'filmstrip', 'shortcuts', 'tileview'
          ],
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
        }
      };
      
      const api = new window.JitsiMeetExternalAPI(domain, options);
      
      api.addEventListener('videoConferenceLeft', () => {
        router.back(); // Redirect back after hanging up
      });
    };

    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
      if (containerRef.current) {
         containerRef.current.innerHTML = ''; // Cleanup iframe
      }
    };
  }, [hasPermissions, cid, user, router]);

  if (!user || !cid) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Campus Chat Call - {cid}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
      </Head>
      
      <div className="h-screen w-full bg-slate-950 flex flex-col pt-safe px-safe">
        <div className="h-16 flex items-center px-4 justify-between shrink-0 bg-slate-900 border-b border-slate-800">
          <button 
            onClick={() => router.back()}
            className="flex items-center space-x-2 text-slate-300 hover:text-white p-2"
          >
            <ArrowLeftIcon className="w-5 h-5" />
            <span className="font-bold text-sm">Leave Call</span>
          </button>
          
          <div className="flex items-center space-x-2">
             <div className="w-2 h-2 rounded-full bg-red-500" />
             <span className="text-white text-xs font-black uppercase tracking-widest opacity-80 mt-0.5">Live Secure Session</span>
          </div>
        </div>

        <div className="flex-1 w-full bg-black relative" ref={containerRef}>
          {/* Fallback loading state while iframe mounts */}
          {!hasPermissions && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-10 text-white space-y-4">
              <PhoneArrowDownLeftIcon className="w-12 h-12 text-primary-500" />
              <p className="font-bold text-sm tracking-wide text-slate-400">Requesting Permissions & Connecting...</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
