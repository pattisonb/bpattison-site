// Last.fm API helpers.
//
// The Music page reads Brian's Apple Music listening history via Last.fm
// scrobbles (the Last.fm iOS app can record Apple Music plays).
//
// Setup (.env.local):
//   REACT_APP_LASTFM_API_KEY=...   -> create one at https://www.last.fm/api/account/create
//   REACT_APP_LASTFM_USERNAME=...  -> your Last.fm username
//
// The Last.fm API key is a public, read-only key intended for client-side
// use, so it's fine in the built bundle (unlike a private key!).

const API_ROOT = "https://ws.audioscrobbler.com/2.0/";

// Last.fm serves this hash for artists it has no image for (nearly all of
// them these days). Treat it as "no image" so we can show a nicer fallback.
const PLACEHOLDER_HASH = "2a96cbd8b46e442fc41c2b86b821562f";

export const isConfigured = () =>
  Boolean(
    process.env.REACT_APP_LASTFM_API_KEY &&
      process.env.REACT_APP_LASTFM_USERNAME
  );

const call = async (method, extra = {}) => {
  const params = new URLSearchParams({
    method,
    user: process.env.REACT_APP_LASTFM_USERNAME,
    api_key: process.env.REACT_APP_LASTFM_API_KEY,
    format: "json",
    ...extra,
  });

  const response = await fetch(`${API_ROOT}?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Last.fm request failed (${response.status})`);
  }
  const data = await response.json();
  if (data.error) {
    throw new Error(data.message || `Last.fm error ${data.error}`);
  }
  return data;
};

const pickImage = (images) => {
  if (!Array.isArray(images)) return null;
  const bySize =
    images.find((i) => i.size === "extralarge") ||
    images.find((i) => i.size === "large") ||
    images[images.length - 1];
  const url = bySize && bySize["#text"];
  if (!url || url.includes(PLACEHOLDER_HASH)) return null;
  return url;
};

const asArray = (value) => {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
};

// Dropdown label -> Last.fm period parameter.
export const PERIODS = {
  "Last 4 Weeks": "1month",
  "Last 6 Months": "6month",
  "All Time": "overall",
};

// Recent tracks. The first entry carries nowPlaying: true when a track is
// currently scrobbling.
export const getRecentTracks = async (limit = 8) => {
  const data = await call("user.getrecenttracks", { limit });
  return asArray(data.recenttracks?.track).map((t) => ({
    name: t.name,
    artist: t.artist?.name || t.artist?.["#text"] || "",
    url: t.url,
    image: pickImage(t.image),
    nowPlaying: t["@attr"]?.nowplaying === "true",
  }));
};

export const getTopTracks = async (periodLabel, limit = 5) => {
  const data = await call("user.gettoptracks", {
    period: PERIODS[periodLabel] || "1month",
    limit,
  });
  return asArray(data.toptracks?.track).map((t) => ({
    name: t.name,
    artist: t.artist?.name || "",
    url: t.url,
    image: pickImage(t.image),
    playCount: Number(t.playcount) || 0,
  }));
};

export const getTopArtists = async (periodLabel, limit = 5) => {
  const data = await call("user.gettopartists", {
    period: PERIODS[periodLabel] || "1month",
    limit,
  });
  return asArray(data.topartists?.artist).map((a) => ({
    name: a.name,
    url: a.url,
    image: pickImage(a.image),
    playCount: Number(a.playcount) || 0,
  }));
};
