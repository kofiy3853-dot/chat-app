let persistentAudioContext = null;

/**
 * Robust notification sound logic that reuses a single AudioContext to prevent
 * memory leaks and "AudioContext was not allowed to start" warnings in browsers.
 */
export const playNotificationSound = () => {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;

    // Singleton AudioContext
    if (!persistentAudioContext || persistentAudioContext.state === 'closed') {
      persistentAudioContext = new Ctx();
    }

    // Resume context if it was suspended (browser policy)
    if (persistentAudioContext.state === 'suspended') {
      persistentAudioContext.resume();
    }

    const osc = persistentAudioContext.createOscillator();
    const gain = persistentAudioContext.createGain();
    
    osc.connect(gain);
    gain.connect(persistentAudioContext.destination);

    // Modern 'Soft' notification tone
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, persistentAudioContext.currentTime); // A5 note
    osc.frequency.exponentialRampToValueAtTime(440, persistentAudioContext.currentTime + 0.1); // Slide to A4

    gain.gain.setValueAtTime(0, persistentAudioContext.currentTime);
    gain.gain.linearRampToValueAtTime(0.1, persistentAudioContext.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, persistentAudioContext.currentTime + 0.15);

    osc.start(persistentAudioContext.currentTime);
    osc.stop(persistentAudioContext.currentTime + 0.15);

    // Cleanup node manually to be extra safe
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
  } catch (e) {
    console.debug('[Sound] Audio playback skipped:', e.message);
  }
};
