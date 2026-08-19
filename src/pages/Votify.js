import React, { useEffect, useRef, useState } from "react";
import {
  FaSpotify,
  FaVoteYea,
  FaCheck,
  FaTimes,
  FaPlus,
  FaSearch,
} from "react-icons/fa";
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  getDoc,
  deleteDoc,
} from "firebase/firestore";
import { votifyDb } from "../utils/votifyFirebase";
import {
  searchTracks,
  getUser,
  getTrack,
  getNowPlaying,
  addTrackToQueue,
} from "../utils/votifySpotify";
import {
  beginLogin,
  exchangeCodeForToken,
  refreshAccessToken,
} from "../utils/votifyAuth";
import "../styles/Votify.css";

const NOMINATION_SECONDS = 300; // a nomination is open for 5 minutes

const LS = {
  token: "votify_token",
  refresh: "votify_refresh",
  expiry: "votify_expiry",
  role: "votify_role",
  name: "votify_name",
  sessionID: "votify_sessionID",
  leader: "votify_leader",
};

const readLS = (key) => {
  try {
    return window.localStorage.getItem(key);
  } catch (e) {
    return null;
  }
};
const writeLS = (key, value) => {
  try {
    window.localStorage.setItem(key, value);
  } catch (e) {}
};
const clearLS = (key) => {
  try {
    window.localStorage.removeItem(key);
  } catch (e) {}
};

const randomGuest = () => `Guest ${Math.floor(1000 + Math.random() * 9000)}`;

function Artists({ artists }) {
  return (
    <>
      {artists.map((artist, index) => (
        <React.Fragment key={artist.id || index}>
          {artist.name}
          {index !== artists.length - 1 &&
            (index !== artists.length - 2 ? ", " : " and ")}
        </React.Fragment>
      ))}
    </>
  );
}

function NowPlaying({ track }) {
  const albumImage = track.album?.images?.[0]?.url;
  return (
    <div className="votify-now-playing">
      {albumImage && (
        <img src={albumImage} alt={track.name} className="votify-np-art" />
      )}
      <div className="votify-np-info">
        <span className="votify-np-status">Now playing</span>
        <p className="votify-np-title">{track.name}</p>
        <p className="votify-np-artist">
          <Artists artists={track.artists || []} />
        </p>
      </div>
    </div>
  );
}

function SearchResult({ track, onNominate, nominated }) {
  const albumImage = track.album?.images?.[0]?.url;
  return (
    <div className="votify-result">
      {albumImage && (
        <img src={albumImage} alt={track.name} className="votify-result-art" />
      )}
      <div className="votify-result-info">
        <p className="votify-result-title">{track.name}</p>
        <p className="votify-result-artist">
          <Artists artists={track.artists || []} />
        </p>
      </div>
      <button
        type="button"
        className="votify-nominate-btn"
        onClick={() => onNominate(track)}
        disabled={nominated}
      >
        <FaPlus /> {nominated ? "Added" : "Nominate"}
      </button>
    </div>
  );
}

function NominatedTrack({ track, user, sessionID, isLeader, queueToken }) {
  const {
    album,
    artists = [],
    name,
    id,
    nominatedBy,
    upvotes = [],
    downvotes = [],
    timestamp,
  } = track;
  const albumImage = album?.images?.[0]?.url;

  const canVote = user !== nominatedBy;
  const votedUp = upvotes.includes(user);
  const votedDown = downvotes.includes(user);

  const castVote = (up) => {
    if (!canVote) return;
    const nextUp = up
      ? [...upvotes.filter((u) => u !== user), user]
      : upvotes.filter((u) => u !== user);
    const nextDown = up
      ? downvotes.filter((u) => u !== user)
      : [...downvotes.filter((u) => u !== user), user];
    setDoc(doc(votifyDb, `${sessionID}:tracks`, id), {
      trackID: id,
      nominatedBy,
      upvotes: nextUp,
      downvotes: nextDown,
      timestamp,
    }).catch((e) => console.error("Vote failed:", e));
  };

  const [remaining, setRemaining] = useState(NOMINATION_SECONDS);
  useEffect(() => {
    if (!timestamp || typeof timestamp.toDate !== "function") return undefined;
    const startMs = timestamp.toDate().getTime();
    const compute = () =>
      Math.max(
        0,
        NOMINATION_SECONDS - Math.floor((Date.now() - startMs) / 1000)
      );
    setRemaining(compute());
    const interval = setInterval(() => {
      const r = compute();
      setRemaining(r);
      if (r <= 0) {
        clearInterval(interval);
        deleteDoc(doc(votifyDb, `${sessionID}:tracks`, id))
          .then(() => {
            if (isLeader && queueToken && upvotes.length > downvotes.length) {
              return addTrackToQueue(queueToken, id);
            }
            return undefined;
          })
          .catch((e) => console.error("Expiry handling failed:", e));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [
    timestamp,
    id,
    sessionID,
    isLeader,
    queueToken,
    upvotes.length,
    downvotes.length,
  ]);

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const formatted = `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  const score = upvotes.length - downvotes.length;

  return (
    <div className="votify-nom">
      {albumImage && (
        <img src={albumImage} alt={name} className="votify-nom-art" />
      )}
      <div className="votify-nom-info">
        <p className="votify-nom-title">{name}</p>
        <p className="votify-nom-artist">
          <Artists artists={artists} />
        </p>
        <span className="votify-nom-timer">{formatted} left</span>
      </div>
      <div className="votify-vote">
        <button
          className={`votify-vote-btn up${votedUp ? " active" : ""}`}
          onClick={() => castVote(true)}
          disabled={!canVote || votedUp}
          aria-label="Upvote"
        >
          <FaCheck />
        </button>
        <span className="votify-score">{score > 0 ? `+${score}` : score}</span>
        <button
          className={`votify-vote-btn down${votedDown ? " active" : ""}`}
          onClick={() => castVote(false)}
          disabled={!canVote || votedDown}
          aria-label="Downvote"
        >
          <FaTimes />
        </button>
      </div>
    </div>
  );
}

function Votify() {
  const [token, setToken] = useState(""); // host's own Spotify token
  const [user, setUser] = useState(""); // display name (host) or entered name (guest)
  const [role, setRole] = useState(""); // "host" | "guest" | ""
  const [error, setError] = useState(null);

  const [sessionID, setSessionID] = useState("");
  const [sessionLeader, setSessionLeader] = useState("");
  const [hostToken, setHostToken] = useState(""); // token guests borrow to search

  const [nominatedTracks, setNominatedTracks] = useState([]);
  const [nowPlaying, setNowPlaying] = useState(null);

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchKey, setSearchKey] = useState("");
  const [results, setResults] = useState([]);

  const [sessionIdInput, setSessionIdInput] = useState("");
  const [guestName, setGuestName] = useState("");

  const lastNowPlayingId = useRef(null);
  const lastPublishedToken = useRef(null);

  // The token used for read-only Spotify calls (search / track lookup): the
  // host uses their own; guests borrow the host's from the session doc.
  const apiToken = role === "host" ? token : hostToken;
  const isLeader = role === "host";

  const saveTokens = (data) => {
    writeLS(LS.token, data.access_token);
    if (data.refresh_token) writeLS(LS.refresh, data.refresh_token);
    writeLS(LS.expiry, String(Date.now() + (data.expires_in || 3600) * 1000));
  };

  // 1. Finish login (exchange ?code), or restore a saved host token / guest seat.
  useEffect(() => {
    let active = true;
    const init = async () => {
      const code = new URLSearchParams(window.location.search).get("code");
      if (code) {
        try {
          const data = await exchangeCodeForToken(code);
          saveTokens(data);
          if (active) setToken(data.access_token);
        } catch (e) {
          console.error("Token exchange failed:", e);
          if (active) setError("Spotify login failed — please try again.");
        }
        window.history.replaceState(null, "", window.location.pathname);
        return;
      }

      if (readLS(LS.role) === "guest") {
        const sid = readLS(LS.sessionID);
        if (sid && active) {
          setRole("guest");
          setSessionID(sid);
          setSessionLeader(readLS(LS.leader) || "");
          setUser(readLS(LS.name) || randomGuest());
        }
        return;
      }

      const access = readLS(LS.token);
      const expiry = Number(readLS(LS.expiry) || 0);
      const refresh = readLS(LS.refresh);
      if (access && Date.now() < expiry - 10000) {
        if (active) setToken(access);
      } else if (refresh) {
        try {
          const data = await refreshAccessToken(refresh);
          saveTokens(data);
          if (active) setToken(data.access_token);
        } catch (e) {
          console.error("Token refresh failed:", e);
          [LS.token, LS.refresh, LS.expiry].forEach(clearLS);
        }
      }
    };
    init();
    return () => {
      active = false;
    };
  }, []);

  // 2. With a host token, load the display name and restore any host session.
  useEffect(() => {
    if (!token) return undefined;
    let active = true;
    getUser(token)
      .then((data) => {
        if (!active) return;
        const name = data.display_name || data.id || "Host";
        setUser(name);
        if (readLS(LS.role) === "host") {
          const sid = readLS(LS.sessionID);
          if (sid) {
            setRole("host");
            setSessionID(sid);
            setSessionLeader(readLS(LS.leader) || name);
          }
        }
      })
      .catch((e) => {
        console.error("Spotify user fetch failed:", e);
        setError("Your Spotify session expired — please log in again.");
        [LS.token, LS.refresh, LS.expiry].forEach(clearLS);
        setToken("");
      });
    return () => {
      active = false;
    };
  }, [token]);

  // 3. Refresh the host token shortly before it expires.
  useEffect(() => {
    if (!token) return undefined;
    const expiry = Number(readLS(LS.expiry) || 0);
    const refresh = readLS(LS.refresh);
    if (!expiry || !refresh) return undefined;
    const delay = Math.max(2000, expiry - Date.now() - 60000);
    const timer = setTimeout(async () => {
      try {
        const data = await refreshAccessToken(refresh);
        saveTokens(data);
        setToken(data.access_token);
      } catch (e) {
        console.error("Scheduled refresh failed:", e);
      }
    }, delay);
    return () => clearTimeout(timer);
  }, [token]);

  // 4. Live subscription to the session's nominated tracks.
  useEffect(() => {
    if (!apiToken || !sessionID) {
      setNominatedTracks([]);
      return undefined;
    }
    const ref = collection(votifyDb, `${sessionID}:tracks`);
    const unsubscribe = onSnapshot(ref, (snapshot) => {
      Promise.all(
        snapshot.docs.map(async (d) => {
          const details = await getTrack(apiToken, d.id);
          const data = d.data();
          return {
            ...details,
            upvotes: data.upvotes || [],
            downvotes: data.downvotes || [],
            nominatedBy: data.nominatedBy,
            timestamp: data.timestamp,
          };
        })
      )
        .then((tracks) => {
          tracks.sort(
            (a, b) => (a.timestamp?.seconds || 0) - (b.timestamp?.seconds || 0)
          );
          setNominatedTracks(tracks);
        })
        .catch((e) => console.error("Loading nominations failed:", e));
    });
    return () => unsubscribe();
  }, [apiToken, sessionID]);

  // 5. Now-playing sync. The host publishes their playback + a fresh borrow
  //    token to the session doc; guests read both from it.
  useEffect(() => {
    if (!sessionID) return undefined;
    if (role === "host" && !token) return undefined;
    if (role === "guest" && !hostToken && !sessionID) return undefined;
    let cancelled = false;
    const dataRef = doc(votifyDb, `${sessionID}:data`, `${sessionID}`);

    const tick = async () => {
      try {
        if (role === "host") {
          if (lastPublishedToken.current !== token) {
            lastPublishedToken.current = token;
            await setDoc(dataRef, { hostToken: token }, { merge: true });
          }
          const playback = await getNowPlaying(token);
          if (playback && playback.item) {
            if (!cancelled) setNowPlaying(playback.item);
            if (lastNowPlayingId.current !== playback.item.id) {
              lastNowPlayingId.current = playback.item.id;
              await setDoc(
                dataRef,
                { nowPlaying: playback.item.id },
                { merge: true }
              );
            }
          }
        } else {
          const snap = await getDoc(dataRef);
          const data = snap.data();
          if (!data) return;
          if (data.hostToken && data.hostToken !== hostToken && !cancelled) {
            setHostToken(data.hostToken);
          }
          const borrow = data.hostToken || hostToken;
          if (data.nowPlaying && borrow && lastNowPlayingId.current !== data.nowPlaying) {
            lastNowPlayingId.current = data.nowPlaying;
            const details = await getTrack(borrow, data.nowPlaying);
            if (!cancelled) setNowPlaying(details);
          }
        }
      } catch (e) {
        // transient network/playback errors are fine to skip
      }
    };

    tick();
    const interval = setInterval(tick, 4000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [role, token, hostToken, sessionID, user]);

  const logout = () => {
    setToken("");
    setUser("");
    setRole("");
    setSessionID("");
    setSessionLeader("");
    setNowPlaying(null);
    setHostToken("");
    lastNowPlayingId.current = null;
    lastPublishedToken.current = null;
    Object.values(LS).forEach(clearLS);
  };

  const handleStartSession = async () => {
    if (!token || !user) return;
    try {
      const id = String(Math.floor(1000 + Math.random() * 9000));
      await setDoc(doc(votifyDb, `${id}:data`, id), {
        sessionID: id,
        leader: user,
        hostToken: token,
      });
      setRole("host");
      setSessionID(id);
      setSessionLeader(user);
      lastNowPlayingId.current = null;
      lastPublishedToken.current = token;
      writeLS(LS.role, "host");
      writeLS(LS.sessionID, id);
      writeLS(LS.leader, user);
      setError(null);
    } catch (e) {
      console.error("Start session failed:", e);
      setError("Couldn't start a session. Try again.");
    }
  };

  const handleJoinSession = async () => {
    const id = sessionIdInput.trim();
    if (!id) return;
    const name = guestName.trim() || randomGuest();
    try {
      const snap = await getDoc(doc(votifyDb, `${id}:data`, id));
      if (!snap.exists()) {
        setError(`No session found with code ${id}.`);
        return;
      }
      const data = snap.data();
      setRole("guest");
      setSessionID(id);
      setSessionLeader(data.leader || "");
      setHostToken(data.hostToken || "");
      setUser(name);
      lastNowPlayingId.current = null;
      writeLS(LS.role, "guest");
      writeLS(LS.sessionID, id);
      writeLS(LS.leader, data.leader || "");
      writeLS(LS.name, name);
      setSessionIdInput("");
      setError(null);
    } catch (e) {
      console.error("Join session failed:", e);
      setError("Couldn't join that session. Try again.");
    }
  };

  const handleLeaveSession = () => {
    const wasGuest = role === "guest";
    setSessionID("");
    setSessionLeader("");
    setNowPlaying(null);
    setHostToken("");
    setSearchOpen(false);
    setResults([]);
    setRole("");
    lastNowPlayingId.current = null;
    if (wasGuest) setUser("");
    [LS.role, LS.sessionID, LS.leader, LS.name].forEach(clearLS);
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!apiToken || !searchKey.trim()) return;
    try {
      setResults(await searchTracks(apiToken, searchKey.trim()));
    } catch (err) {
      console.error("Search failed:", err);
      setError("Search failed. Try again.");
    }
  };

  const handleNominate = async (track) => {
    try {
      await setDoc(doc(votifyDb, `${sessionID}:tracks`, track.id), {
        trackID: track.id,
        nominatedBy: user,
        upvotes: [user],
        downvotes: [],
        timestamp: new Date(),
      });
    } catch (e) {
      console.error("Nominate failed:", e);
      setError("Couldn't nominate that track.");
    }
  };

  const nominatedIds = nominatedTracks.map((t) => t.id);

  return (
    <div className="votify-page">
      <section className="votify-hero">
        <div className="container">
          <span className="section-label votify-label">
            <FaVoteYea /> Votify
          </span>
          <h1>Vote on what plays next</h1>
          <p>
            Host a session, share the code, and let the room pick the music.
            The host logs in with Spotify; everyone else just joins with a name
            and votes.
          </p>
        </div>
      </section>

      <div className="container">
        {error && <div className="votify-error">{error}</div>}

        {!sessionID && (
          <div className="votify-lobby">
            <div className="votify-card">
              <h2>Host a session</h2>
              {token && user ? (
                <>
                  <p>
                    Logged in as {user}. Start a room and share the code —
                    winning tracks queue to your Spotify.
                  </p>
                  <button className="votify-btn" onClick={handleStartSession}>
                    Start session
                  </button>
                </>
              ) : (
                <>
                  <p>
                    Log in with Spotify to host. Winners queue to your player,
                    so hosting needs Spotify Premium.
                  </p>
                  <button className="votify-btn" onClick={() => beginLogin()}>
                    <FaSpotify /> Log in to host
                  </button>
                </>
              )}
            </div>

            <div className="votify-card">
              <h2>Join a session</h2>
              <p>Enter a code to nominate and vote — no login needed.</p>
              <div className="votify-join-fields">
                <input
                  className="votify-input"
                  type="text"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="Your name"
                />
                <div className="votify-join">
                  <input
                    className="votify-input"
                    type="text"
                    inputMode="numeric"
                    value={sessionIdInput}
                    onChange={(e) => setSessionIdInput(e.target.value)}
                    placeholder="Session code"
                  />
                  <button className="votify-btn" onClick={handleJoinSession}>
                    Join
                  </button>
                </div>
              </div>
            </div>

            {token && (
              <button className="votify-link-btn" onClick={logout}>
                Log out
              </button>
            )}
          </div>
        )}

        {sessionID && (
          <div className="votify-session">
            <div className="votify-session-head">
              <div>
                <span className="section-label">
                  {role === "guest"
                    ? `${sessionLeader || "Host"}'s room · ${user}`
                    : "Your room"}
                </span>
                <h2>
                  Session <span className="votify-code">{sessionID}</span>
                </h2>
              </div>
              <div className="votify-session-actions">
                <button
                  className="votify-btn"
                  onClick={() => setSearchOpen((v) => !v)}
                >
                  <FaSearch /> {searchOpen ? "Close" : "Search & nominate"}
                </button>
                <button
                  className="votify-link-btn"
                  onClick={handleLeaveSession}
                >
                  Leave
                </button>
              </div>
            </div>

            {nowPlaying && nowPlaying.album && <NowPlaying track={nowPlaying} />}

            {searchOpen && (
              <div className="votify-card votify-search">
                <form className="votify-search-form" onSubmit={handleSearch}>
                  <input
                    className="votify-input"
                    type="text"
                    value={searchKey}
                    onChange={(e) => setSearchKey(e.target.value)}
                    placeholder="Search Spotify for a track..."
                  />
                  <button className="votify-btn" type="submit">
                    Search
                  </button>
                </form>
                {!apiToken && (
                  <p className="votify-note">
                    Waiting for the host's connection before search is
                    available…
                  </p>
                )}
                <div className="votify-results">
                  {results.map((track) => (
                    <SearchResult
                      key={track.id}
                      track={track}
                      onNominate={handleNominate}
                      nominated={nominatedIds.includes(track.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="votify-noms">
              <div className="tracks-header">
                <h2>Up next</h2>
                <span className="votify-count">
                  {nominatedTracks.length} nominated
                </span>
              </div>
              {nominatedTracks.length === 0 ? (
                <p className="votify-empty">
                  No nominations yet. Hit “Search &amp; nominate” to add the
                  first track.
                </p>
              ) : (
                <div className="votify-noms-list">
                  {nominatedTracks.map((track) => (
                    <NominatedTrack
                      key={track.id}
                      track={track}
                      user={user}
                      sessionID={sessionID}
                      isLeader={isLeader}
                      queueToken={token}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Votify;
