import React, { useEffect, useState } from "react";
import { FaSpotify } from "react-icons/fa";

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

  useEffect(() => {
    const delay = setTimeout(() => setAnimate(true), 200);
    return () => clearTimeout(delay);
  }, []);

  const live = isPlaying !== undefined;

  const image = live ? albumImageUrl : lastAlbumImageUrl;
  const songTitle = live ? title : lastTitle;
  const songArtist = live ? artist : lastArtist;
  const link = live ? songUrl : lastSongUrl;

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
