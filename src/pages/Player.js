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
    <div className={`np-card ${animate ? "is-in" : ""}`}>
      <div className="np-card__art">
        <img src={image} alt={songTitle} />
        {live && (
          <span className="np-bars" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
          </span>
        )}
      </div>

      <div className="np-card__body">
        <span className={`np-status ${live ? "is-live" : ""}`}>
          {live ? "Now playing" : "Last played"}
        </span>
        <h2 className="np-card__title">{songTitle}</h2>
        <p className="np-card__artist">{songArtist}</p>
        <a
          href={link}
          className="np-card__link"
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
