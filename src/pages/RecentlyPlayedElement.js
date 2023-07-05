import React from "react";
import "../styles/recentlyPlayed.css";

const RecentlyPlayedElement = ({ track }) => {
  const { album, artists, external_urls, name } = track;
  const albumImage = album.images[0]?.url || "fallback-image-url";

  return (
    <div className="recently-played-element" style={{ padding: "10px" }}>
      <img src={albumImage} alt={name} className="album-cover" />
      <div className="song-info">
        <p className="song-title">{name}</p>
        <p className="artist-name">
          {artists.map((artist, index) => (
            <React.Fragment key={artist.id}>
              <a
                href={artist.external_urls.spotify}
                target="_blank"
                rel="noopener noreferrer"
              >
                {artist.name}
              </a>
              {index !== artists.length - 1 &&
                (index !== artists.length - 2 ? ", " : " and ")}
            </React.Fragment>
          ))}
        </p>
      </div>
    </div>
  );
};

export default RecentlyPlayedElement;
