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

// Upcoming tracks in the player's queue (empty when nothing is queued).
export async function getQueue(token) {
  const res = await axios.get(`${BASE}/me/player/queue`, {
    headers: authHeader(token),
    validateStatus: (s) => s === 200 || s === 204,
  });
  return res.data?.queue || [];
}

export async function addTrackToQueue(token, trackId) {
  await axios.post(`${BASE}/me/player/queue`, null, {
    headers: authHeader(token),
    params: { uri: `spotify:track:${trackId}` },
  });
}

// The logged-in user's playlists (first 50).
export async function getMyPlaylists(token) {
  const { data } = await axios.get(`${BASE}/me/playlists`, {
    headers: authHeader(token),
    params: { limit: 50 },
  });
  return (data.items || []).filter(Boolean);
}

// Tracks inside one playlist (first 100, skipping local files).
export async function getPlaylistTracks(token, playlistId) {
  const { data } = await axios.get(`${BASE}/playlists/${playlistId}/tracks`, {
    headers: authHeader(token),
    params: { limit: 100 },
  });
  return (data.items || []).map((i) => i.track).filter((t) => t && t.id);
}

// Full details for many tracks at once, 50 per request like the API allows.
export async function getTracksBatch(token, trackIds) {
  const out = [];
  for (let i = 0; i < trackIds.length; i += 50) {
    const { data } = await axios.get(`${BASE}/tracks`, {
      headers: authHeader(token),
      params: { ids: trackIds.slice(i, i + 50).join(",") },
    });
    out.push(...(data.tracks || []));
  }
  return out;
}

// Whether each track is already in the user's liked songs.
export async function checkSavedTracks(token, trackIds) {
  const { data } = await axios.get(`${BASE}/me/tracks/contains`, {
    headers: authHeader(token),
    params: { ids: trackIds.join(",") },
  });
  return data;
}

export async function saveTrack(token, trackId) {
  await axios.put(`${BASE}/me/tracks`, { ids: [trackId] }, {
    headers: authHeader(token),
  });
}

export async function removeSavedTrack(token, trackId) {
  await axios.delete(`${BASE}/me/tracks`, {
    headers: authHeader(token),
    data: { ids: [trackId] },
  });
}

// Makes a new private playlist on the user's account.
export async function createPlaylist(token, userId, name, description) {
  const { data } = await axios.post(
    `${BASE}/users/${userId}/playlists`,
    { name, description, public: false },
    { headers: authHeader(token) }
  );
  return data;
}

// Adds tracks to a playlist, 100 per request like the API allows.
export async function addTracksToPlaylist(token, playlistId, trackIds) {
  for (let i = 0; i < trackIds.length; i += 100) {
    await axios.post(
      `${BASE}/playlists/${playlistId}/tracks`,
      { uris: trackIds.slice(i, i + 100).map((id) => `spotify:track:${id}`) },
      { headers: authHeader(token) }
    );
  }
}

// The user's liked songs, 50 at a time.
export async function getSavedTracks(token, offset = 0) {
  const { data } = await axios.get(`${BASE}/me/tracks`, {
    headers: authHeader(token),
    params: { limit: 50, offset },
  });
  return (data.items || []).map((i) => i.track).filter((t) => t && t.id);
}
