const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');

/**
 * GET /api/turn/credentials
 * Returns fresh ICE server config (STUN + dynamic TURN credentials).
 * Requires METERED_API_KEY and METERED_APP_NAME in backend .env
 *
 * Sign up free at: https://www.metered.ca/tools/openrelay
 */
router.get('/credentials', protect, async (req, res) => {
  try {
    const apiKey  = process.env.METERED_API_KEY;
    const appName = process.env.METERED_APP_NAME;

    // If Metered is configured, fetch live credentials
    if (apiKey && appName) {
      const response = await fetch(
        `https://${appName}.metered.live/api/v1/turn/credentials?apiKey=${apiKey}`
      );

      if (!response.ok) throw new Error('Metered API error: ' + response.status);

      const iceServers = await response.json();
      return res.json({ iceServers });
    }

    // Fallback: static TURN servers when env vars not set (for local dev)
    console.warn('[TURN] METERED_API_KEY not set — using static fallback TURN servers');
    return res.json({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'turn:openrelay.metered.ca:80',              username: 'openrelayproject', credential: 'openrelayproject' },
        { urls: 'turn:openrelay.metered.ca:80?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' },
        { urls: 'turn:openrelay.metered.ca:443',             username: 'openrelayproject', credential: 'openrelayproject' },
        { urls: 'turn:openrelay.metered.ca:443?transport=tcp',username: 'openrelayproject', credential: 'openrelayproject' },
        { urls: 'turn:freestun.net:3478', username: 'free', credential: 'free' },
      ],
    });
  } catch (error) {
    console.error('[TURN] Failed to fetch credentials:', error.message);
    res.status(500).json({ message: 'Could not fetch TURN credentials', error: error.message });
  }
});

module.exports = router;
