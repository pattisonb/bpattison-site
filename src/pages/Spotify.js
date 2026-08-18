import React, { useEffect, useState } from "react";
import { FaSpotify, FaChevronDown } from "react-icons/fa";
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
import TopArtistElement from "./TopArtistElement";
import "../styles/Spotify.css";

const timeOptions = ["Last 4 Weeks", "Last 6 Months", "All Time"];

function TimeDropdown({ selected, onSelect, open, setOpen }) {
  return (
    <div className="dropdown">
      <button
        type="button"
        className="dropdown-select"
        onClick={() => setOpen(!open)}
      >
        {selected}
        <FaChevronDown className={open ? "open" : ""} />
      </button>
      {open && (
        <div className="dropdown-options">
          {timeOptions.map((option) => (
            <button
              key={option}
              type="button"
              className={
                "dropdown-option" + (option === selected ? " selected" : "")
              }
              onClick={() => onSelect(option)}
            >
              {option}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Spotify() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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
    ])
      .then((results) => {
        const [
          nowPlayingItem,
          recentlyPlayedItems,
          topTrackItemsShort,
          topArtistItemsShort,
        ] = results;

        const recentItems = recentlyPlayedItems?.items || [];
        const trackItems = topTrackItemsShort?.items || [];
        const artistItems = topArtistItemsShort?.items || [];

        setNowPlaying(nowPlayingItem || {});
        setRecentlyPlayed(recentItems);
        setTopTracks(trackItems);
        setTopArtists(artistItems);

        if (!recentItems.length && !trackItems.length && !artistItems.length) {
          console.error("Spotify API returned no data:", {
            recentlyPlayedItems,
            topTrackItemsShort,
            topArtistItemsShort,
          });
          setError("Couldn't load data from Spotify right now.");
        }
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching data:", error);
        setError("Couldn't load data from Spotify right now.");
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
      setTopTracks(tracks?.items || []);
    };

    fetchTop().catch((error) => {
      console.error("Error fetching data:", error);
    });
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
      setTopArtists(artists?.items || []);
    };

    fetchTop().catch((error) => {
      console.error("Error fetching data:", error);
    });
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
    <div className="spotify-page">
      <section className="spotify-hero">
        <div className="container">
          <span className="section-label spotify-label">
            <FaSpotify /> Spotify
          </span>
          <h1>What I'm listening to</h1>
          <p>
            Pulled live from my Spotify: what's playing right now, recent plays,
            and my most-played tracks and artists.
          </p>
        </div>
      </section>

      <div className="container">
        {loading && (
          <div className="spotify-loading">
            <div className="spotify-spinner" />
            <p>Loading...</p>
          </div>
        )}

        {!loading && error && (
          <div className="spotify-loading">
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && (
          <>
            {recentlyPlayed.length > 0 && (
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
            )}

            <div className="tracks-container">
              <section className="tracks-column">
                <div className="tracks-header">
                  <h2>Recently Played</h2>
                </div>
                <div className="tracks-list">
                  {getRecentlyPlayedTracks().map((track) => (
                    <RecentlyPlayedElement
                      key={track.played_at}
                      track={track.track}
                    />
                  ))}
                </div>
              </section>

              <section className="tracks-column">
                <div className="tracks-header">
                  <h2>Top Tracks</h2>
                  <TimeDropdown
                    selected={selectedTrackOption}
                    onSelect={handleTrackOptionSelect}
                    open={isTrackDropdownOpen}
                    setOpen={setIsTrackDropdownOpen}
                  />
                </div>
                <div className="tracks-list">
                  {topTracks.map((track) => (
                    <RecentlyPlayedElement key={track.id} track={track} />
                  ))}
                </div>
              </section>

              <section className="tracks-column">
                <div className="tracks-header">
                  <h2>Top Artists</h2>
                  <TimeDropdown
                    selected={selectedArtistOption}
                    onSelect={handleArtistOptionSelect}
                    open={isArtistDropdownOpen}
                    setOpen={setIsArtistDropdownOpen}
                  />
                </div>
                <div className="tracks-list">
                  {topArtists.map((artist) => (
                    <TopArtistElement key={artist.id} artist={artist} />
                  ))}
                </div>
              </section>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Spotify;
