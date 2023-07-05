import React, { useEffect, useState } from "react";
import {
  getNowPlayingItem,
  getRecentlyPlayed,
  getTopArtistsShort,
  getTopTracksShort,
  getTopArtistsMedium,
  getTopTracksMedium,
  getTopArtistsLong,
  getTopTracksLong,
} from "../utils/spotifyUtils";
import Player from "./Player";
import RecentlyPlayedElement from "./RecentlyPlayedElement";
import "../styles/Spotify.css";
import TopArtistElement from "./TopArtistElement";

function Spotify() {
  const [loading, setLoading] = useState(true);
  const [nowPlaying, setNowPlaying] = useState({});
  const [recentlyPlayed, setRecentlyPlayed] = useState([]);
  const [topTracks, setTopTracks] = useState([]);
  const [topArtists, setTopArtists] = useState([]);
  const [selectedTrackOption, setSelectedTrackOption] =
    useState("Last 4 Weeks");
  const [selectedArtistOption, setSelectedArtistOption] =
    useState("Last 4 Weeks");
  const [isTrackDropdownOpen, setIsTrackDropdownOpen] = useState(false);
  const [isArtistDropdownOpen, setIsArtistDropdownOpen] = useState(false);

  useEffect(() => {
    Promise.all([
      getNowPlayingItem(
        process.env.REACT_APP_SPOTIFY_CLIENT_ID,
        process.env.REACT_APP_SPOTIFY_CLIENT_SECRET,
        process.env.REACT_APP_SPOTIFY_REFRESH_TOKEN
      ),
      getRecentlyPlayed(
        process.env.REACT_APP_SPOTIFY_CLIENT_ID,
        process.env.REACT_APP_SPOTIFY_CLIENT_SECRET,
        process.env.REACT_APP_SPOTIFY_REFRESH_TOKEN
      ),
      getTopTracksShort(
        process.env.REACT_APP_SPOTIFY_CLIENT_ID,
        process.env.REACT_APP_SPOTIFY_CLIENT_SECRET,
        process.env.REACT_APP_SPOTIFY_REFRESH_TOKEN
      ),
      getTopArtistsShort(
        process.env.REACT_APP_SPOTIFY_CLIENT_ID,
        process.env.REACT_APP_SPOTIFY_CLIENT_SECRET,
        process.env.REACT_APP_SPOTIFY_REFRESH_TOKEN
      ),
    ]).then((results) => {
      const [
        nowPlayingItem,
        recentlyPlayedItems,
        topTrackItemsShort,
        topArtistItemsShort,
      ] = results;
      setNowPlaying(nowPlayingItem);
      setRecentlyPlayed(recentlyPlayedItems.items);
      setTopTracks(topTrackItemsShort.items);
      setTopArtists(topArtistItemsShort.items);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    const fetchTop = async () => {
      let tracks;
      switch (selectedTrackOption) {
        case "Last 4 Weeks":
          tracks = await getTopTracksShort(
            process.env.REACT_APP_SPOTIFY_CLIENT_ID,
            process.env.REACT_APP_SPOTIFY_CLIENT_SECRET,
            process.env.REACT_APP_SPOTIFY_REFRESH_TOKEN
          );
          break;
        case "Last 6 Months":
          tracks = await getTopTracksMedium(
            process.env.REACT_APP_SPOTIFY_CLIENT_ID,
            process.env.REACT_APP_SPOTIFY_CLIENT_SECRET,
            process.env.REACT_APP_SPOTIFY_REFRESH_TOKEN
          );
          break;
        case "All Time":
          tracks = await getTopTracksLong(
            process.env.REACT_APP_SPOTIFY_CLIENT_ID,
            process.env.REACT_APP_SPOTIFY_CLIENT_SECRET,
            process.env.REACT_APP_SPOTIFY_REFRESH_TOKEN
          );
          break;
        default:
          tracks = await getTopTracksShort(
            process.env.REACT_APP_SPOTIFY_CLIENT_ID,
            process.env.REACT_APP_SPOTIFY_CLIENT_SECRET,
            process.env.REACT_APP_SPOTIFY_REFRESH_TOKEN
          );
          break;
      }
      setTopTracks(tracks.items);
    };

    fetchTop();
  }, [selectedTrackOption]);

  useEffect(() => {
    const fetchTop = async () => {
      let artists;
      switch (selectedArtistOption) {
        case "Last 4 Weeks":
          artists = await getTopArtistsShort(
            process.env.REACT_APP_SPOTIFY_CLIENT_ID,
            process.env.REACT_APP_SPOTIFY_CLIENT_SECRET,
            process.env.REACT_APP_SPOTIFY_REFRESH_TOKEN
          );
          break;
        case "Last 6 Months":
          artists = await getTopArtistsMedium(
            process.env.REACT_APP_SPOTIFY_CLIENT_ID,
            process.env.REACT_APP_SPOTIFY_CLIENT_SECRET,
            process.env.REACT_APP_SPOTIFY_REFRESH_TOKEN
          );
          break;
        case "All Time":
          artists = await getTopArtistsLong(
            process.env.REACT_APP_SPOTIFY_CLIENT_ID,
            process.env.REACT_APP_SPOTIFY_CLIENT_SECRET,
            process.env.REACT_APP_SPOTIFY_REFRESH_TOKEN
          );
          break;
        default:
          artists = await getTopArtistsShort(
            process.env.REACT_APP_SPOTIFY_CLIENT_ID,
            process.env.REACT_APP_SPOTIFY_CLIENT_SECRET,
            process.env.REACT_APP_SPOTIFY_REFRESH_TOKEN
          );
          break;
      }
      setTopArtists(artists.items);
    };

    fetchTop();
  }, [selectedArtistOption]);

  const getRecentlyPlayedTracks = () => {
    if (nowPlaying.isPlaying !== undefined) {
      return recentlyPlayed.slice(0, -1);
    } else {
      return recentlyPlayed.slice(1);
    }
  };

  const handleTrackOptionSelect = (option) => {
    setSelectedTrackOption(option);
    setIsTrackDropdownOpen(false);
  };

  const handleArtistOptionSelect = (option) => {
    setSelectedArtistOption(option);
    setIsArtistDropdownOpen(false);
  };

  return (
    <div style={{ marginTop: "80px" }}>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <>
          <Player
            albumImageUrl={nowPlaying.albumImageUrl}
            artist={nowPlaying.artist}
            isPlaying={nowPlaying.isPlaying}
            songUrl={nowPlaying.songUrl}
            title={nowPlaying.title}
            lastAlbumImageUrl={recentlyPlayed[0].track.album.images[0].url}
            lastArtist={recentlyPlayed[0].track.artists[0].name}
            lastSongUrl={recentlyPlayed[0].track.external_urls.spotify}
            lastTitle={recentlyPlayed[0].track.name}
          />
          <div className="tracks-container" style={{ marginTop: "80px" }}>
            <div style={{ marginInline: "20px" }}>
              <h2>Recently Played</h2>
              <div className="tracks-list">
                {getRecentlyPlayedTracks().map((track) => (
                  <RecentlyPlayedElement
                    key={track.played_at}
                    track={track.track}
                  />
                ))}
              </div>
            </div>
            <div style={{ marginInline: "20px" }}>
              <h2>
                Top Tracks
                <div className="dropdown">
                  <span
                    className="dropdown-select"
                    onClick={() => setIsTrackDropdownOpen(!isTrackDropdownOpen)}
                  >
                    {selectedTrackOption}
                  </span>
                  {isTrackDropdownOpen && (
                    <div className="dropdown-options">
                      <a
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          handleTrackOptionSelect("Last 4 Weeks");
                        }}
                      >
                        Last 4 Weeks
                      </a>
                      <a
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          handleTrackOptionSelect("Last 6 Months");
                        }}
                      >
                        Last 6 Months
                      </a>
                      <a
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          handleTrackOptionSelect("All Time");
                        }}
                      >
                        All Time
                      </a>
                    </div>
                  )}
                </div>
              </h2>
              <div className="tracks-list">
                {topTracks.map((track) => (
                  <RecentlyPlayedElement key={track.id} track={track} />
                ))}
              </div>
            </div>
            <div style={{ marginInline: "20px" }}>
              <h2>
                Top Artists
                <div className="dropdown">
                  <span
                    className="dropdown-select"
                    onClick={() =>
                      setIsArtistDropdownOpen(!isArtistDropdownOpen)
                    }
                  >
                    {selectedArtistOption}
                  </span>
                  {isArtistDropdownOpen && (
                    <div className="dropdown-options">
                      <a
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          handleArtistOptionSelect("Last 4 Weeks");
                        }}
                      >
                        Last 4 Weeks
                      </a>
                      <a
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          handleArtistOptionSelect("Last 6 Months");
                        }}
                      >
                        Last 6 Months
                      </a>
                      <a
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          handleArtistOptionSelect("All Time");
                        }}
                      >
                        All Time
                      </a>
                    </div>
                  )}
                </div>
              </h2>
              <div className="tracks-list">
                {topArtists.map((artist) => (
                  <TopArtistElement key={artist.id} artist={artist} />
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default Spotify;
