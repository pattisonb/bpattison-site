import React, { useEffect, useState } from "react";
import { FaSpotify } from "react-icons/fa";

//fake post id from the song so it changes when the track does
const listingId = (text) => {
  let id = 0;
  for (let i = 0; i < text.length; i++) {
    id = (id * 31 + text.charCodeAt(i)) % 10000000000;
  }
  return String(id).padStart(10, "7");
};

const Player = ({
  albumImageUrl,
  artist,
  isPlaying,
  songUrl,
  title,
  lastAlbumImageUrl,
  lastArtist,
  lastSongUrl,
  lastTitle,
}) => {
  const [animate, setAnimate] = useState(false);
  const [craigslist, setCraigslist] = useState(
    document.documentElement.getAttribute("data-style") === "craigslist"
  );

  useEffect(() => {
    const delay = setTimeout(() => setAnimate(true), 200);
    return () => clearTimeout(delay);
  }, []);

  //rerender when the craigslist toggle in the navbar flips
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setCraigslist(
        document.documentElement.getAttribute("data-style") === "craigslist"
      );
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-style"],
    });
    return () => observer.disconnect();
  }, []);

  const live = isPlaying !== undefined;

  const image = live ? albumImageUrl : lastAlbumImageUrl;
  const songTitle = live ? title : lastTitle;
  const songArtist = live ? artist : lastArtist;
  const link = live ? songUrl : lastSongUrl;

  if (craigslist) {
    const posted = live ? "just now" : "a little while ago";
    return (
      <div className="listing">
        <div className="listing-nav">◀ prev &nbsp; ▲ &nbsp; next ▶</div>
        <div className="listing-bar">
          <a
            className="listing-reply"
            href={link}
            target="_blank"
            rel="noopener noreferrer"
          >
            reply
          </a>
          <span className="listing-actions">
            <span>favorite</span>
            <span>hide</span>
            <span>flag</span>
            <span>share</span>
          </span>
          <span>
            Posted <u>{posted}</u>
          </span>
          <span className="listing-print">print</span>
        </div>

        <h2 className="listing-title">
          {live ? "Now playing" : "Last played"}: {songTitle} - {songArtist}
        </h2>

        <img src={image} alt={songTitle} className="listing-image" />

        <div className="listing-footer">
          <span>post id: {listingId(songTitle + songArtist)}</span>
          <span>
            posted: <u>{posted}</u>
          </span>
          <span>
            ♡ <u>best of</u> <sup>[?]</sup>
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`now-playing ${animate ? "show" : ""}`}>
      <div className="now-playing-art">
        <img src={image} alt={songTitle} />
        {live && (
          <span className="eq-bars" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
          </span>
        )}
      </div>

      <div className="now-playing-info">
        <span className={`play-status ${live ? "live" : ""}`}>
          {live ? "Now playing" : "Last played"}
        </span>
        <h2 className="play-title">{songTitle}</h2>
        <p className="play-artist">{songArtist}</p>
        <a
          href={link}
          className="spotify-link"
          target="_blank"
          rel="noopener noreferrer"
        >
          <FaSpotify /> Listen on Spotify
        </a>
      </div>
    </div>
  );
};

export default Player;
