import React from "react";
import "../styles/topArtist.css";

const TopArtistElement = ({ artist }) => {
  const { external_urls, images, name } = artist;
  const artistImage = images[0]?.url || "fallback-image-url";

  return (
    <div className="top-artist-element">
      <img src={artistImage} alt={name} className="artist-image" />
      <div className="artist-info">
        <p className="artist-name">
          <a
            href={external_urls.spotify}
            target="_blank"
            rel="noopener noreferrer"
          >
            {name}
          </a>
        </p>
      </div>
    </div>
  );
};

export default TopArtistElement;
