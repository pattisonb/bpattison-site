const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const logger = require("firebase-functions/logger");

// Spotify app credentials live in Google Secret Manager, never in the browser
// bundle. Set them once with:
//   firebase functions:secrets:set SPOTIFY_CLIENT_ID
//   firebase functions:secrets:set SPOTIFY_CLIENT_SECRET
const SPOTIFY_CLIENT_ID = defineSecret("SPOTIFY_CLIENT_ID");
const SPOTIFY_CLIENT_SECRET = defineSecret("SPOTIFY_CLIENT_SECRET");

// Reuse one app token across requests until it's about to expire. Client
// Credentials tokens are read-only over the public catalog — they cannot touch
// any user's account or playback — so it's safe to hand this to the browser.
let cached = { token: null, expiresAt: 0 };

exports.spotifyAppToken = onRequest(
  { secrets: [SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET], cors: true },
  async (req, res) => {
    try {
      const now = Date.now();
      if (cached.token && now < cached.expiresAt - 60000) {
        return res.json({
          access_token: cached.token,
          expires_in: Math.floor((cached.expiresAt - now) / 1000),
        });
      }

      const basic = Buffer.from(
        `${SPOTIFY_CLIENT_ID.value()}:${SPOTIFY_CLIENT_SECRET.value()}`
      ).toString("base64");

      const response = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {
          Authorization: `Basic ${basic}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: "grant_type=client_credentials",
      });

      if (!response.ok) {
        const text = await response.text();
        logger.error("Spotify token request failed", response.status, text);
        return res.status(502).json({ error: "token_request_failed" });
      }

      const data = await response.json();
      cached = {
        token: data.access_token,
        expiresAt: now + data.expires_in * 1000,
      };
      return res.json({
        access_token: data.access_token,
        expires_in: data.expires_in,
      });
    } catch (err) {
      logger.error("spotifyAppToken error", err);
      return res.status(500).json({ error: "internal" });
    }
  }
);
