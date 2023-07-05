const TOKEN_ENDPOINT = `https://accounts.spotify.com/api/token`;
const NOW_PLAYING_ENDPOINT = `https://api.spotify.com/v1/me/player/currently-playing`;
const RECENTLY_PLAYED_ENDPOINT = `https://api.spotify.com/v1/me/player/recently-played`;
const TOP_TRACKS_ENDPOINT_SHORT = `https://api.spotify.com/v1/me/top/tracks?time_range=short_term&limit=5&offset=0`;
const TOP_ARTISTS_ENDPOINT_SHORT = `https://api.spotify.com/v1/me/top/artists?time_range=short_term&limit=5&offset=0`;
const TOP_TRACKS_ENDPOINT_MEDIUM = `https://api.spotify.com/v1/me/top/tracks?time_range=medium_term&limit=5&offset=0`;
const TOP_ARTISTS_ENDPOINT_MEDIUM = `https://api.spotify.com/v1/me/top/artists?time_range=medium_term&limit=5&offset=0`;
const TOP_TRACKS_ENDPOINT_LONG = `https://api.spotify.com/v1/me/top/tracks?time_range=long_term&limit=5&offset=0`;
const TOP_ARTISTS_ENDPOINT_LONG = `https://api.spotify.com/v1/me/top/artists?time_range=long_term&limit=5&offset=0`;

const getAccessToken = async (client_id, client_secret, refresh_token) => {
  const basic = btoa(`${client_id}:${client_secret}`);
  const response = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token,
    }),
  });

  return response.json();
};

export const getNowPlaying = async (
  client_id,
  client_secret,
  refresh_token
) => {
  const { access_token } = await getAccessToken(
    client_id,
    client_secret,
    refresh_token
  );
  return fetch(NOW_PLAYING_ENDPOINT, {
    headers: {
      Authorization: `Bearer ${access_token}`,
    },
  });
};

export const getNowPlayingItem = async (
  client_id,
  client_secret,
  refresh_token
) => {
  const response = await getNowPlaying(client_id, client_secret, refresh_token);
  if (response.status === 204 || response.status > 400) {
    return false;
  }
  const song = await response.json();
  const albumImageUrl = song.item.album.images[0].url;
  const artist = song.item.artists.map((_artist) => _artist.name).join(", ");
  const isPlaying = song.is_playing;
  const songUrl = song.item.external_urls.spotify;
  const title = song.item.name;

  return {
    albumImageUrl,
    artist,
    isPlaying,
    songUrl,
    title,
  };
};

export const getRecentlyPlayed = async (
  client_id,
  client_secret,
  refresh_token
) => {
  const { access_token } = await getAccessToken(
    client_id,
    client_secret,
    refresh_token
  );

  const headers = {
    Authorization: `Bearer ${access_token}`,
    "Content-Type": "application/json",
  };

  return fetch(`${RECENTLY_PLAYED_ENDPOINT}?limit=6`, {
    headers: headers,
  })
    .then((response) => response.json())
    .then((data) => {
      return data;
    })
    .catch((error) => {
      // Handle any errors that occurred during the request
    });
};

export const getTopTracksShort = async (
  client_id,
  client_secret,
  refresh_token
) => {
  const { access_token } = await getAccessToken(
    client_id,
    client_secret,
    refresh_token
  );

  const headers = {
    Authorization: `Bearer ${access_token}`,
    "Content-Type": "application/json",
  };

  return fetch(`${TOP_TRACKS_ENDPOINT_SHORT}`, {
    headers: headers,
  })
    .then((response) => response.json())
    .then((data) => {
      return data;
    })
    .catch((error) => {
      // Handle any errors that occurred during the request
    });
};

export const getTopArtistsShort = async (
  client_id,
  client_secret,
  refresh_token
) => {
  const { access_token } = await getAccessToken(
    client_id,
    client_secret,
    refresh_token
  );

  const headers = {
    Authorization: `Bearer ${access_token}`,
    "Content-Type": "application/json",
  };

  return fetch(`${TOP_ARTISTS_ENDPOINT_SHORT}`, {
    headers: headers,
  })
    .then((response) => response.json())
    .then((data) => {
      return data;
    })
    .catch((error) => {
      // Handle any errors that occurred during the request
    });
};

export const getTopTracksMedium = async (
  client_id,
  client_secret,
  refresh_token
) => {
  const { access_token } = await getAccessToken(
    client_id,
    client_secret,
    refresh_token
  );

  const headers = {
    Authorization: `Bearer ${access_token}`,
    "Content-Type": "application/json",
  };

  return fetch(`${TOP_TRACKS_ENDPOINT_MEDIUM}`, {
    headers: headers,
  })
    .then((response) => response.json())
    .then((data) => {
      return data;
    })
    .catch((error) => {
      // Handle any errors that occurred during the request
    });
};

export const getTopArtistsMedium = async (
  client_id,
  client_secret,
  refresh_token
) => {
  const { access_token } = await getAccessToken(
    client_id,
    client_secret,
    refresh_token
  );

  const headers = {
    Authorization: `Bearer ${access_token}`,
    "Content-Type": "application/json",
  };

  return fetch(`${TOP_ARTISTS_ENDPOINT_MEDIUM}`, {
    headers: headers,
  })
    .then((response) => response.json())
    .then((data) => {
      return data;
    })
    .catch((error) => {
      // Handle any errors that occurred during the request
    });
};

export const getTopTracksLong = async (
  client_id,
  client_secret,
  refresh_token
) => {
  const { access_token } = await getAccessToken(
    client_id,
    client_secret,
    refresh_token
  );

  const headers = {
    Authorization: `Bearer ${access_token}`,
    "Content-Type": "application/json",
  };

  return fetch(`${TOP_TRACKS_ENDPOINT_LONG}`, {
    headers: headers,
  })
    .then((response) => response.json())
    .then((data) => {
      return data;
    })
    .catch((error) => {
      // Handle any errors that occurred during the request
    });
};

export const getTopArtistsLong = async (
  client_id,
  client_secret,
  refresh_token
) => {
  const { access_token } = await getAccessToken(
    client_id,
    client_secret,
    refresh_token
  );

  const headers = {
    Authorization: `Bearer ${access_token}`,
    "Content-Type": "application/json",
  };

  return fetch(`${TOP_ARTISTS_ENDPOINT_LONG}`, {
    headers: headers,
  })
    .then((response) => response.json())
    .then((data) => {
      return data;
    })
    .catch((error) => {
      // Handle any errors that occurred during the request
    });
};
