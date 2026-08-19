// Spotify Authorization Code flow with PKCE for Votify.
//
// Spotify disabled the old implicit ("token") grant, so browser apps must use
// Authorization Code + PKCE: we send a hashed one-time "code_challenge" to the
// login page, get a short "?code" back, then exchange it for tokens using the
// original "code_verifier". No client secret is involved, so nothing secret
// ships in the bundle.

const AUTH_ENDPOINT = "https://accounts.spotify.com/authorize";
const TOKEN_ENDPOINT = "https://accounts.spotify.com/api/token";
const CLIENT_ID = "fbd29f2d306b49389413797452ded225";
const SCOPE =
  "user-read-playback-state user-read-currently-playing user-modify-playback-state";
const VERIFIER_KEY = "votify_verifier";

// Must match a Redirect URI registered on the Spotify app exactly. Derived from
// the current origin so it works on 127.0.0.1 in dev and the real domain in prod.
const redirectUri = () => `${window.location.origin}/projects/votify`;

const CHARS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";

function randomString(length) {
  const values = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(values, (v) => CHARS[v % CHARS.length]).join("");
}

async function sha256(plain) {
  const data = new TextEncoder().encode(plain);
  return crypto.subtle.digest("SHA-256", data);
}

function base64url(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

// Kicks off login: builds the PKCE challenge, stashes the verifier, and sends
// the browser to Spotify. Returns a promise that never resolves (page unloads).
export async function beginLogin() {
  const verifier = randomString(64);
  const challenge = base64url(await sha256(verifier));
  window.localStorage.setItem(VERIFIER_KEY, verifier);

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: "code",
    redirect_uri: redirectUri(),
    scope: SCOPE,
    code_challenge_method: "S256",
    code_challenge: challenge,
  });
  window.location.assign(`${AUTH_ENDPOINT}?${params.toString()}`);
}

// Exchanges the ?code from the redirect for access + refresh tokens.
export async function exchangeCodeForToken(code) {
  const verifier = window.localStorage.getItem(VERIFIER_KEY);
  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri(),
    code_verifier: verifier || "",
  });

  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) throw new Error(`Token exchange failed (${res.status})`);
  window.localStorage.removeItem(VERIFIER_KEY);
  return res.json();
}

// Trades a refresh token for a fresh access token.
export async function refreshAccessToken(refresh_token) {
  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    grant_type: "refresh_token",
    refresh_token,
  });

  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) throw new Error(`Token refresh failed (${res.status})`);
  return res.json();
}
