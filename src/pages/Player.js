import React, { useEffect, useState } from 'react';

const Player = ({ albumImageUrl, artist, isPlaying, songUrl, title, lastAlbumImageUrl, lastArtist, lastSongUrl, lastTitle }) => {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    const delay = setTimeout(() => {
      setAnimate(true);
    }, 500); // Adjust the delay duration as needed (in milliseconds)

    return () => clearTimeout(delay);
  }, []);

  const playerStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    backgroundColor: '#f2f2f2',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
  };

  const imageStyle = {
    width: '200px',
    height: '200px',
    borderRadius: '50%',
    marginBottom: '20px',
  };

  const titleStyle = {
    fontSize: '24px',
    fontWeight: 'bold',
    marginBottom: '10px',
    color: '#333',
    opacity: animate ? 1 : 0,
    transition: 'opacity 0.5s, transform 0.5s',
    transform: animate ? 'translateX(0)' : 'translateX(-100px)',
  };

  const artistStyle = {
    fontSize: '18px',
    marginBottom: '10px',
    color: '#555',
    opacity: animate ? 1 : 0,
    transition: 'opacity 0.5s, transform 0.5s',
    transform: animate ? 'translateX(0)' : 'translateX(100px)',
  };

  const linkStyle = {
    fontSize: '14px',
    color: '#800080',
    textDecoration: 'none',
  };

  if (isPlaying === undefined) {
    return (
      <div style={playerStyle}>
        <h2 style={{ textAlign: 'center', padding: '10px' }}>Brian is not currently listening to anything. Last played song: </h2>
        <img src={lastAlbumImageUrl} alt="Album Cover" style={imageStyle} />
      <div style={titleStyle}>{lastTitle}</div>
      <div style={artistStyle}>{lastArtist}</div>
      <a href={lastSongUrl} style={linkStyle} target="_blank" rel="noopener noreferrer">
        Listen on Spotify
      </a>
      </div>
    );
  }

  return (
    <div style={playerStyle}>
      <h2 style={{ textAlign: 'center', padding: '10px' }}>Brian is currently listening to:</h2>
      <img src={albumImageUrl} alt="Album Cover" style={imageStyle} />
      <div style={titleStyle}>{title}</div>
      <div style={artistStyle}>{artist}</div>
      <a href={songUrl} style={linkStyle} target="_blank" rel="noopener noreferrer">
        Listen on Spotify
      </a>
    </div>
  );
};

export default Player;
