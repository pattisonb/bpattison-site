import React, { useEffect, useState } from "react";
import { FaApple, FaChevronDown } from "react-icons/fa";
import {
  isConfigured,
  getRecentTracks,
  getTopTracks,
  getTopArtists,
  PERIODS,
} from "../utils/lastfm";
import "../styles/Music.css";

const TIME_OPTIONS = Object.keys(PERIODS);

// Deterministic gradient avatar for artists Last.fm has no image for.
const AVATAR_GRADIENTS = [
  ["#fa243c", "#fb5c74"],
  ["#4f46e5", "#7c3aed"],
  ["#0ea5e9", "#22d3ee"],
  ["#f59e0b", "#f97316"],
  ["#10b981", "#34d399"],
];

function Artwork({ image, name, round }) {
  if (image) {
    return (
      <img
        src={image}
        alt={name}
        className={`am-art ${round ? "am-art--round" : ""}`}
      />
    );
  }
  const [c1, c2] =
    AVATAR_GRADIENTS[
      (name || "?").charCodeAt(0) % AVATAR_GRADIENTS.length
    ];
  return (
    <span
      className={`am-art am-art--fallback ${round ? "am-art--round" : ""}`}
      style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}
      aria-hidden="true"
    >
      {(name || "?").charAt(0).toUpperCase()}
    </span>
  );
}

function TimeDropdown({ selected, onSelect, open, setOpen }) {
  return (
    <div className="am-dropdown">
      <button
        type="button"
        className="am-dropdown__btn"
        onClick={() => setOpen(!open)}
      >
        {selected}
        <FaChevronDown className={open ? "is-open" : ""} />
      </button>
      {open && (
        <div className="am-dropdown__menu">
          {TIME_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              className={
                "am-dropdown__item" + (option === selected ? " is-active" : "")
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

function TrackRow({ item, meta }) {
  return (
    <a
      className="am-row"
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
    >
      <Artwork image={item.image} name={item.name} />
      <span className="am-row__info">
        <span className="am-row__title">{item.name}</span>
        <span className="am-row__sub">{item.artist}</span>
      </span>
      {meta && <span className="am-row__meta">{meta}</span>}
    </a>
  );
}

function ArtistRow({ artist }) {
  return (
    <a
      className="am-row"
      href={artist.url}
      target="_blank"
      rel="noopener noreferrer"
    >
      <Artwork image={artist.image} name={artist.name} round />
      <span className="am-row__info">
        <span className="am-row__title">{artist.name}</span>
      </span>
      <span className="am-row__meta">{artist.playCount} plays</span>
    </a>
  );
}

function Music() {
  const configured = isConfigured();
  const [loading, setLoading] = useState(configured);
  const [error, setError] = useState(null);
  const [recent, setRecent] = useState([]);
  const [topTracks, setTopTracks] = useState([]);
  const [topArtists, setTopArtists] = useState([]);
  const [trackPeriod, setTrackPeriod] = useState("Last 4 Weeks");
  const [artistPeriod, setArtistPeriod] = useState("Last 4 Weeks");
  const [trackDropdownOpen, setTrackDropdownOpen] = useState(false);
  const [artistDropdownOpen, setArtistDropdownOpen] = useState(false);

  useEffect(() => {
    if (!configured) return;
    Promise.all([
      getRecentTracks(8),
      getTopTracks("Last 4 Weeks"),
      getTopArtists("Last 4 Weeks"),
    ])
      .then(([recentItems, trackItems, artistItems]) => {
        setRecent(recentItems);
        setTopTracks(trackItems);
        setTopArtists(artistItems);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error loading listening data:", err);
        setError("Couldn't load listening data right now.");
        setLoading(false);
      });
  }, [configured]);

  useEffect(() => {
    if (!configured) return;
    getTopTracks(trackPeriod)
      .then(setTopTracks)
      .catch((err) => console.error("Error loading top tracks:", err));
  }, [configured, trackPeriod]);

  useEffect(() => {
    if (!configured) return;
    getTopArtists(artistPeriod)
      .then(setTopArtists)
      .catch((err) => console.error("Error loading top artists:", err));
  }, [configured, artistPeriod]);

  const nowPlaying = recent.find((t) => t.nowPlaying) || null;
  const featured = nowPlaying || recent[0] || null;
  const recentList = recent.filter((t) => t !== featured).slice(0, 5);

  const handleTrackPeriod = (option) => {
    setTrackPeriod(option);
    setTrackDropdownOpen(false);
  };

  const handleArtistPeriod = (option) => {
    setArtistPeriod(option);
    setArtistDropdownOpen(false);
  };

  return (
    <div className="music-page">
      <section className="music-hero">
        <div className="container">
          <span className="eyebrow music-eyebrow">
            <FaApple /> Apple Music
          </span>
          <h1 className="music-hero__title">What I'm listening to</h1>
          <p className="music-hero__sub">
            My Apple Music listening history, updated as I play things: what's
            on right now, recent plays, and my most-played tracks and artists.
          </p>
        </div>
      </section>

      <div className="container">
        {!configured && (
          <div className="music-state">
            <p>
              This page isn't hooked up yet. It needs a Last.fm API key and
              username in <code>.env.local</code> to load listening data.
            </p>
          </div>
        )}

        {configured && loading && (
          <div className="music-state">
            <div className="music-spinner" />
            <p>Loading listening data…</p>
          </div>
        )}

        {configured && error && (
          <div className="music-state">
            <p>{error}</p>
          </div>
        )}

        {configured && !loading && !error && (
          <>
            {featured && (
              <div className="am-card">
                <div className="am-card__art">
                  <Artwork image={featured.image} name={featured.name} />
                  {nowPlaying && (
                    <span className="am-bars" aria-hidden="true">
                      <span />
                      <span />
                      <span />
                      <span />
                    </span>
                  )}
                </div>
                <div className="am-card__body">
                  <span
                    className={`am-status ${nowPlaying ? "is-live" : ""}`}
                  >
                    {nowPlaying ? "Now playing" : "Last played"}
                  </span>
                  <h2 className="am-card__title">{featured.name}</h2>
                  <p className="am-card__artist">{featured.artist}</p>
                  <a
                    href={featured.url}
                    className="am-card__link"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <FaApple /> View track
                  </a>
                </div>
              </div>
            )}

            <div className="music-columns">
              <section className="music-panel">
                <div className="music-panel__head">
                  <h2>Recently Played</h2>
                </div>
                <div className="music-list">
                  {recentList.map((track, i) => (
                    <TrackRow key={`${track.url}-${i}`} item={track} />
                  ))}
                </div>
              </section>

              <section className="music-panel">
                <div className="music-panel__head">
                  <h2>Top Tracks</h2>
                  <TimeDropdown
                    selected={trackPeriod}
                    onSelect={handleTrackPeriod}
                    open={trackDropdownOpen}
                    setOpen={setTrackDropdownOpen}
                  />
                </div>
                <div className="music-list">
                  {topTracks.map((track, i) => (
                    <TrackRow
                      key={`${track.url}-${i}`}
                      item={track}
                      meta={`${track.playCount} plays`}
                    />
                  ))}
                </div>
              </section>

              <section className="music-panel">
                <div className="music-panel__head">
                  <h2>Top Artists</h2>
                  <TimeDropdown
                    selected={artistPeriod}
                    onSelect={handleArtistPeriod}
                    open={artistDropdownOpen}
                    setOpen={setArtistDropdownOpen}
                  />
                </div>
                <div className="music-list">
                  {topArtists.map((artist, i) => (
                    <ArtistRow key={`${artist.url}-${i}`} artist={artist} />
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

export default Music;
