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

const TIME_OPTIONS = ["Last 4 Weeks", "Last 6 Months", "All Time"];

// Small self-contained dropdown so the markup below stays tidy.
function TimeDropdown({ selected, onSelect, open, setOpen }) {
  return (
    <div className="sp-dropdown">
      <button
        type="button"
        className="sp-dropdown__btn"
        onClick={() => setOpen(!open)}
      >
        {selected}
        <FaChevronDown className={open ? "is-open" : ""} />
      </button>
      {open && (
        <div className="sp-dropdown__menu">
          {TIME_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              className={
                "sp-dropdown__item" + (option === selected ? " is-active" : "")
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
    <div className="spotify-page">
      <section className="spotify-hero">
        <div className="container">
          <span className="eyebrow spotify-eyebrow">
            <FaSpotify /> Now spinning
          </span>
          <h1 className="spotify-hero__title">My music, in real time</h1>
          <p className="spotify-hero__sub">
            Pulled live from my Spotify — what's playing right now, what I've had
            on repeat, and the artists I keep coming back to.
          </p>
        </div>
      </section>

      <div className="container">
        {loading ? (
          <div className="spotify-loading">
            <div className="spotify-spinner" />
            <p>Loading my listening data…</p>
          </div>
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

            <div className="tracks-container">
              <section className="tracks-panel">
                <div className="tracks-panel__head">
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

              <section className="tracks-panel">
                <div className="tracks-panel__head">
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

              <section className="tracks-panel">
                <div className="tracks-panel__head">
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
