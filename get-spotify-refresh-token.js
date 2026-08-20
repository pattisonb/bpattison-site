/*
 * One-off helper to mint a new Spotify refresh token for the Stats page.
 *
 * Usage:
 *   1. In the Spotify dashboard, open the app whose client ID is in
 *      .env.local (REACT_APP_SPOTIFY_CLIENT_ID) and add this Redirect URI:
 *          http://127.0.0.1:8888/callback
 *   2. Run:  node get-spotify-refresh-token.js
 *   3. Approve in the browser tab that opens.
 *   4. Copy the printed refresh token into .env.local as
 *      REACT_APP_SPOTIFY_REFRESH_TOKEN, then restart `npm start`.
 *
 * Reads client id/secret from .env.local — nothing secret leaves your machine.
 * Delete this file afterward if you like.
 */
const http = require("http");
const fs = require("fs");
const { exec } = require("child_process");

const env = {};
try {
  fs.readFileSync(".env.local", "utf8")
    .split("\n")
    .forEach((line) => {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
      if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    });
} catch (e) {
  console.error("Could not read .env.local from this folder.");
  process.exit(1);
}

const CLIENT_ID = env.REACT_APP_SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = env.REACT_APP_SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI = "http://127.0.0.1:8888/callback";
const SCOPE =
  "user-read-currently-playing user-read-recently-played user-top-read";

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("Missing client id/secret in .env.local.");
  process.exit(1);
}

const authUrl =
  "https://accounts.spotify.com/authorize?" +
  new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: "code",
    redirect_uri: REDIRECT_URI,
    scope: SCOPE,
  }).toString();

const server = http.createServer(async (req, res) => {
  if (!req.url.startsWith("/callback")) {
    res.writeHead(404);
    res.end();
    return;
  }
  const url = new URL(req.url, REDIRECT_URI);
  const error = url.searchParams.get("error");
  const code = url.searchParams.get("code");
  if (error) {
    res.end("Authorization error: " + error);
    console.error("Authorization error:", error);
    server.close();
    return;
  }
  try {
    const basic = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString(
      "base64"
    );
    const r = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: REDIRECT_URI,
      }),
    });
    const data = await r.json();
    if (!data.refresh_token) {
      res.end("No refresh token returned: " + JSON.stringify(data));
      console.error("No refresh token returned:", data);
      server.close();
      return;
    }
    console.log("\n=== YOUR NEW REFRESH TOKEN ===\n");
    console.log(data.refresh_token);
    console.log(
      "\nPaste it into .env.local as REACT_APP_SPOTIFY_REFRESH_TOKEN, then restart `npm start`.\n"
    );
    res.end("Success! Your refresh token is printed in the terminal. You can close this tab.");
  } catch (e) {
    res.end("Token exchange failed: " + e.message);
    console.error(e);
  }
  server.close();
});

server.listen(8888, () => {
  console.log("\nMake sure this Redirect URI is on your Spotify app:");
  console.log("  " + REDIRECT_URI);
  console.log("\nOpening the approval page in your browser...");
  console.log("(If it doesn't open, paste this URL manually:)\n");
  console.log(authUrl + "\n");
  exec(`open "${authUrl}"`);
});
