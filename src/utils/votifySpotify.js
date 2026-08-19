import axios from "axios";

// Spotify Web API helpers for Votify. Unlike the read-only Spotify Stats page
// (which uses Brian's own refresh token server-side), Votify acts on behalf of
// whoever is logged in, so every call takes that user's access token.
const BASE = "https://api.spotify.com/v1";

const authHeader = (token) => ({ Authorization: `Bearer ${token}` });

export async function searchTracks(token, query) {
  const { data } = await axios.get(`${BASE}/search`, {
    headers: authHeader(token),
    params: { q: query, type: "track", limit: 12 },
  });
  return data.tracks.items;
}

export async function getUser(token) {
  const { data } = await axios.get(`${BASE}/me`, { headers: authHeader(token) });
  return data;
}

export async function getTrack(token, trackId) {
  const { data } = await axios.get(`${BASE}/tracks/${trackId}`, {
    headers: authHeader(token),
  });
  return data;
}

// Returns the full /me/player payload, or null when nothing is playing (204).
export async function getNowPlaying(token) {
  const res = await axios.get(`${BASE}/me/player`, {
    headers: authHeader(token),
    validateStatus: (s) => s === 200 || s === 204,
  });
  if (res.status === 204 || !res.data) return null;
  return res.data;
}

export async function addTrackToQueue(token, trackId) {
  await axios.post(`${BASE}/me/player/queue`, null, {
    headers: authHeader(token),
    params: { uri: `spotify:track:${trackId}` },
  });
}
