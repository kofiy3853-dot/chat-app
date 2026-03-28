const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');

/**
 * GET /api/turn/credentials
 * Returns ICE server config with STUN + TURN credentials from environment variables.
 * 
 * Required env vars:
 *   TURN_SERVER_URL  = turn:free.expressturn.com:3478
 *   TURN_USERNAME    = your_username
 *   TURN_CREDENTIAL  = your_password
 */
router.get('/credentials', protect, async (req, res) => {
  try {
    const turnUrl        = process.env.TURN_SERVER_URL;
    const turnUsername   = process.env.TURN_USERNAME;
    const turnCredential = process.env.TURN_CREDENTIAL;

    const iceServers = [
      // STUN — always include as first attempt
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ];

    // Add TURN server if credentials are configured
    if (turnUrl && turnUsername && turnCredential) {
      console.log('[TURN] Using configured TURN server:', turnUrl);

      // UDP (primary)
      iceServers.push({
        urls: turnUrl,
        username: turnUsername,
        credential: turnCredential,
      });

      // TCP transport variant (punches through strict firewalls)
      iceServers.push({
        urls: `${turnUrl}?transport=tcp`,
        username: turnUsername,
        credential: turnCredential,
      });
    } else {
      console.warn('[TURN] No TURN env vars set — returning STUN only');
    }

    return res.json({ iceServers });

  } catch (error) {
    console.error('[TURN] Error building credentials:', error.message);
    res.status(500).json({ message: 'Could not build ICE server config', error: error.message });
  }
});

module.exports = router;
