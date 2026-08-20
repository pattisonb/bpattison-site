import React, { useEffect, useRef, useState } from "react";
import {
  FaSpotify,
  FaVoteYea,
  FaCheck,
  FaTimes,
  FaPlus,
  FaSearch,
  FaInfoCircle,
  FaCommentDots,
  FaCog,
  FaUsers,
  FaArrowLeft,
  FaLock,
  FaQrcode,
  FaHeart,
  FaRegHeart,
} from "react-icons/fa";
import QRCode from "qrcode";
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { votifyDb } from "../utils/votifyFirebase";
import VotifyLogo from "../assets/VotifyLogo.svg";
import {
  searchTracks,
  getUser,
  getTrack,
  getNowPlaying,
  addTrackToQueue,
  getMyPlaylists,
  getPlaylistTracks,
  getSavedTracks,
  createPlaylist,
  addTracksToPlaylist,
  checkSavedTracks,
  saveTrack,
  removeSavedTrack,
} from "../utils/votifySpotify";
import {
  beginLogin,
  exchangeCodeForToken,
  refreshAccessToken,
} from "../utils/votifyAuth";
import "../styles/Votify.css";

// how close to the end of the current song we hand the next one to Spotify
const DISPATCH_WINDOW_MS = 15000;

// the session rules; the host can change all of these from the gear menu
const DEFAULT_SETTINGS = {
  iceSeconds: 300, // how long a song survives on thin ice
  penaltySeconds: 60, // how much time each downvote on the ice costs
  rescueScore: 1, // the score that pulls a song off the ice
  killScore: -3, // the score that removes a song on the spot
  trashCooldownMin: 30, // how long a trashed song stays unnominatable
};

// sessions this browser has hosted, so starting a new one can tidy up old ones
const MY_SESSIONS_KEY = "votify_my_sessions";

// heartbeat + presence timing: the referee stamps the session doc, everyone
// stamps their member doc, and stale stamps mean someone stepped away
const BEAT_EVERY_MS = 12000;
const HOST_STALE_MS = 30000;
const SEEN_EVERY_MS = 30000;
const SEEN_STALE_MS = 90000;

// firestore timestamps, raw dates, and strings all flatten to plain ms
const tsMs = (value) => {
  if (!value) return 0;
  if (typeof value.toDate === "function") return value.toDate().getTime();
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
};

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

// a persistent anonymous id per browser, deliberately NOT cleared on leave or
// logout — votes are keyed to it, so rejoining under a new name can't double-vote
const VOTER_KEY = "votify_voter";
const getVoterId = () => {
  let id = readLS(VOTER_KEY);
  if (!id) {
    id = `voter_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
    writeLS(VOTER_KEY, id);
  }
  return id;
};

const trackScore = (t) =>
  (t.upvotes?.length || 0) - (t.downvotes?.length || 0);

const purgatoryStart = (t) => {
  const p = t.purgatoryAt;
  if (!p) return null;
  return typeof p.toDate === "function" ? p.toDate() : new Date(p);
};

const purgatoryRemaining = (t, rules) => {
  const start = purgatoryStart(t);
  if (!start) return rules.iceSeconds;
  const penalty = (t.penalizedBy || []).length * rules.penaltySeconds;
  return Math.max(
    0,
    rules.iceSeconds - penalty - Math.floor((Date.now() - start.getTime()) / 1000)
  );
};

const orderTracks = (list, mode) => {
  const ts = (t) => t.timestamp?.seconds || 0;
  const sorted = [...list];
  if (mode === "votes") {
    sorted.sort((a, b) => trackScore(b) - trackScore(a) || ts(a) - ts(b));
  } else {
    sorted.sort((a, b) => ts(a) - ts(b));
  }
  return sorted;
};

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

function NowPlaying({ track, endsAt, canAct, liked, onLike, onAddTo }) {
  const albumImage = track.album?.images?.[0]?.url;

  const [secondsLeft, setSecondsLeft] = useState(null);
  useEffect(() => {
    if (!endsAt) {
      setSecondsLeft(null);
      return undefined;
    }
    const compute = () =>
      setSecondsLeft(Math.max(0, Math.round((endsAt - Date.now()) / 1000)));
    compute();
    const interval = setInterval(compute, 1000);
    return () => clearInterval(interval);
  }, [endsAt]);

  const minutes = Math.floor((secondsLeft || 0) / 60);
  const seconds = (secondsLeft || 0) % 60;

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
        {secondsLeft !== null && (
          <span className="votify-np-timer">
            about {minutes}:{seconds < 10 ? "0" : ""}
            {seconds} left, then the top song locks in
          </span>
        )}
      </div>
      {secondsLeft !== null && (track.duration_ms || 0) > 0 && (
        <div
          className="votify-np-bar"
          style={{
            width: `${Math.min(
              100,
              Math.max(0, 100 - (secondsLeft * 100000) / track.duration_ms)
            )}%`,
          }}
        />
      )}
      {canAct && (
        <div className="votify-np-actions">
          <button
            className={`votify-np-btn${liked ? " liked" : ""}`}
            onClick={onLike}
            aria-label={
              liked ? "Remove from your Liked Songs" : "Save to your Liked Songs"
            }
            title={liked ? "In your Liked Songs" : "Save to your Liked Songs"}
          >
            {liked ? <FaHeart /> : <FaRegHeart />}
          </button>
          <button
            className="votify-np-btn"
            onClick={onAddTo}
            aria-label="Add to one of your playlists"
            title="Add to one of your playlists"
          >
            <FaPlus />
          </button>
        </div>
      )}
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

function SessionTrack({ track, position, voter, onVote, purgatory, rules }) {
  const score = trackScore(track);
  const canVote = voter !== (track.nominatedById || track.nominatedBy);
  const votedUp = (track.upvotes || []).includes(voter);
  const votedDown = (track.downvotes || []).includes(voter);
  const albumImage = track.album?.images?.[0]?.url;

  const [remaining, setRemaining] = useState(
    purgatory ? purgatoryRemaining(track, rules) : 0
  );
  useEffect(() => {
    if (!purgatory) return undefined;
    setRemaining(purgatoryRemaining(track, rules));
    const interval = setInterval(
      () => setRemaining(purgatoryRemaining(track, rules)),
      1000
    );
    return () => clearInterval(interval);
  }, [purgatory, track, rules]);

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const formatted = `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;

  return (
    <div className="votify-nom">
      {position != null && <span className="votify-pos">{position}</span>}
      {albumImage && (
        <img src={albumImage} alt={track.name} className="votify-nom-art" />
      )}
      <div className="votify-nom-info">
        <p className="votify-nom-title">
          {track.name}
          {!canVote && <span className="votify-mine-tag">yours</span>}
        </p>
        <p className="votify-nom-artist">
          <Artists artists={track.artists || []} />
        </p>
        {purgatory && (
          <span className="votify-nom-timer">
            {formatted} left, saved at +{rules.rescueScore}
          </span>
        )}
      </div>
      <div className="votify-vote">
        <button
          className={`votify-vote-btn up${votedUp ? " active" : ""}`}
          onClick={() => onVote(track, true)}
          disabled={!canVote || votedUp}
          aria-label="Upvote"
        >
          <FaCheck />
        </button>
        <span className="votify-score">{score > 0 ? `+${score}` : score}</span>
        <button
          className={`votify-vote-btn down${votedDown ? " active" : ""}`}
          onClick={() => onVote(track, false)}
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
  const [spotifyId, setSpotifyId] = useState(""); // Spotify account id, used to reclaim a room
  const [role, setRole] = useState(""); // "host" | "guest" | ""
  const [error, setError] = useState(null);

  const [sessionID, setSessionID] = useState("");
  const [sessionLeader, setSessionLeader] = useState("");
  const [hostToken, setHostToken] = useState(""); // token guests borrow to search

  const [nominatedTracks, setNominatedTracks] = useState([]);
  const [nowPlaying, setNowPlaying] = useState(null);
  const [endsAt, setEndsAt] = useState(null); // rough ms timestamp the current song ends
  const [orderMode, setOrderMode] = useState("added"); // "added" | "votes"
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [members, setMembers] = useState([]);
  const [playedTracks, setPlayedTracks] = useState([]);
  const [lockedIn, setLockedIn] = useState(null); // song name flashed when dispatched
  const [saveState, setSaveState] = useState({ status: "idle", url: "" });
  const [npLiked, setNpLiked] = useState(null); // is now playing in my liked songs
  const [showAddTo, setShowAddTo] = useState(false);
  const [addedTo, setAddedTo] = useState(""); // playlist that just got the song
  const [toast, setToast] = useState(null); // transient bottom message
  const [joining, setJoining] = useState(false);
  const [invited, setInvited] = useState(false); // arrived via an invite link
  const [hostAway, setHostAway] = useState(false); // referee heartbeat went stale
  const [autopilot, setAutopilot] = useState(false); // a deputy is refereeing

  const [searchOpen, setSearchOpen] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [qrData, setQrData] = useState("");
  const [draft, setDraft] = useState(null); // settings form values while editing
  const [searchKey, setSearchKey] = useState("");
  const [results, setResults] = useState([]);

  // nominate-from-your-library state (only for people logged into Spotify)
  const [nomTab, setNomTab] = useState("search"); // "search" | "playlists" | "liked"
  const [playlists, setPlaylists] = useState(null);
  const [activePlaylist, setActivePlaylist] = useState(null);
  const [playlistTracks, setPlaylistTracks] = useState([]);
  const [likedTracks, setLikedTracks] = useState(null);
  const [likedDone, setLikedDone] = useState(false);
  const [libNote, setLibNote] = useState(null);

  const [sessionIdInput, setSessionIdInput] = useState("");
  const [guestName, setGuestName] = useState("");

  const voterId = useRef(getVoterId()).current;
  const lastNowPlayingId = useRef(null);
  const lastPublishedToken = useRef(null);
  const lastEndsAt = useRef(null);
  const dispatchedFor = useRef(null);
  const tracksRef = useRef([]);
  const orderModeRef = useRef("added");
  const settingsRef = useRef(DEFAULT_SETTINGS);
  const detailsCache = useRef(new Map());
  const lastLockedAt = useRef(0);
  const lockedTimer = useRef(null);
  const toastTimer = useRef(null);
  const lastBeatWrite = useRef(0);
  const lastSeenWrite = useRef(0);
  const membersRef = useRef([]);
  const alertedIce = useRef(new Set());
  const nameInputRef = useRef(null);
  const missingRoom = useRef(0);

  useEffect(() => {
    tracksRef.current = nominatedTracks;
  }, [nominatedTracks]);

  useEffect(() => {
    membersRef.current = members;
  }, [members]);

  useEffect(() => {
    orderModeRef.current = orderMode;
  }, [orderMode]);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  // let escape close the popups
  useEffect(() => {
    if (!showInfo && !showSettings && !showQr && !showAddTo) return;
    const onKey = (e) => {
      if (e.key === "Escape") {
        setShowInfo(false);
        setShowSettings(false);
        setShowQr(false);
        setShowAddTo(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showInfo, showSettings, showQr, showAddTo]);

  // flash the locked-in banner for a few seconds
  const showLocked = (name) => {
    setLockedIn(name || "the top song");
    if (lockedTimer.current) clearTimeout(lockedTimer.current);
    lockedTimer.current = setTimeout(() => setLockedIn(null), 8000);
  };

  // small bottom toast for in-session feedback, where a banner at the top of
  // the page would scroll right out of view on a phone
  const notify = (message) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 4200);
  };

  const buzz = (pattern) => {
    try {
      if (navigator.vibrate) navigator.vibrate(pattern);
    } catch (e) {}
  };

  // The token used for read-only Spotify calls (search / track lookup): anyone
  // logged into Spotify uses their own (so results match their account);
  // everyone else borrows the host's from the session doc.
  const apiToken = token || hostToken;

  const saveTokens = (data) => {
    writeLS(LS.token, data.access_token);
    if (data.refresh_token) writeLS(LS.refresh, data.refresh_token);
    writeLS(LS.expiry, String(Date.now() + (data.expires_in || 3600) * 1000));
  };

  // 1. Finish login (exchange ?code), or restore a saved host token / guest seat.
  useEffect(() => {
    let active = true;
    const init = async () => {
      const params = new URLSearchParams(window.location.search);

      // arrived through an invite link: prefill the session code
      const joinCode = params.get("join");
      if (joinCode && active) {
        setSessionIdInput(joinCode);
        setInvited(true);
        window.history.replaceState(null, "", window.location.pathname);
      }

      // restore a guest seat first so a Spotify login from inside a session
      // comes back to the same room
      if (readLS(LS.role) === "guest") {
        const sid = readLS(LS.sessionID);
        if (sid && active) {
          setRole("guest");
          setSessionID(sid);
          setSessionLeader(readLS(LS.leader) || "");
          setUser(readLS(LS.name) || randomGuest());
        }
      }

      const code = params.get("code");
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
        // someone seated as a guest keeps the name they joined with
        if (readLS(LS.role) !== "guest") setUser(name);
        setSpotifyId(data.id || "");
        if (readLS(LS.role) === "host") {
          const sid = readLS(LS.sessionID);
          if (sid) {
            // only retake the seat if the room still exists — it may have
            // been closed by a newer session on another device
            getDoc(doc(votifyDb, `${sid}:data`, sid))
              .then((snap) => {
                if (!active) return;
                if (!snap.exists()) {
                  [LS.role, LS.sessionID, LS.leader].forEach(clearLS);
                  return;
                }
                const room = snap.data();
                setRole("host");
                setSessionID(sid);
                setSessionLeader(readLS(LS.leader) || name);
                setOrderMode(room.orderMode || "added");
                if (room.settings)
                  setSettings({ ...DEFAULT_SETTINGS, ...room.settings });
              })
              .catch(() => {});
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

  // 2b. Invite arrivals just need to type a name — put the cursor there.
  useEffect(() => {
    if (invited && !sessionID && nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, [invited, sessionID]);

  // 2c. Keep the host's screen awake so the room's referee never naps.
  useEffect(() => {
    if (role !== "host" || !sessionID) return undefined;
    let lock = null;
    let released = false;
    const grab = async () => {
      try {
        if (navigator.wakeLock && !released) {
          lock = await navigator.wakeLock.request("screen");
        }
      } catch (e) {} // battery saver can refuse; the deputy covers that
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") grab();
    };
    grab();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      released = true;
      document.removeEventListener("visibilitychange", onVisible);
      if (lock) lock.release().catch(() => {});
    };
  }, [role, sessionID]);

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
          const data = d.data();
          // track details never change, so look each song up once and keep
          // it; one failed lookup skips that song instead of freezing the list
          let details = detailsCache.current.get(d.id);
          if (!details) {
            try {
              details = await getTrack(apiToken, d.id);
              detailsCache.current.set(d.id, details);
            } catch (e) {
              console.error("Track lookup failed:", e);
              return null;
            }
          }
          return {
            ...details,
            upvotes: data.upvotes || [],
            downvotes: data.downvotes || [],
            nominatedBy: data.nominatedBy,
            nominatedById: data.nominatedById || null,
            timestamp: data.timestamp,
            purgatoryAt: data.purgatoryAt || null,
            penalizedBy: data.penalizedBy || [],
          };
        })
      ).then((tracks) => {
        const loaded = tracks.filter(Boolean);
        loaded.sort(
          (a, b) => (a.timestamp?.seconds || 0) - (b.timestamp?.seconds || 0)
        );
        setNominatedTracks(loaded);
      });
    });
    return () => unsubscribe();
  }, [apiToken, sessionID]);

  // 4b. Who's in the room. Everyone keeps a small member doc beside the
  //     session doc, so the list stays live without any extra polling.
  useEffect(() => {
    if (!sessionID) {
      setMembers([]);
      return undefined;
    }
    const ref = collection(votifyDb, `${sessionID}:data`);
    const unsubscribe = onSnapshot(ref, (snapshot) => {
      const list = [];
      snapshot.docs.forEach((d) => {
        if (d.id === sessionID) return;
        const data = d.data();
        if (data.name)
          list.push({
            id: d.id,
            name: data.name,
            host: !!data.host,
            seen: tsMs(data.lastSeen),
          });
      });
      list.sort(
        (a, b) =>
          (b.host ? 1 : 0) - (a.host ? 1 : 0) || a.name.localeCompare(b.name)
      );
      setMembers(list);
    });
    return () => unsubscribe();
  }, [sessionID]);

  const memberDoc = (sid) =>
    doc(votifyDb, `${sid}:data`, `member_${voterId}`);

  // 4c. Tonight's setlist: every song the room has locked in so far.
  useEffect(() => {
    if (!sessionID) {
      setPlayedTracks([]);
      return undefined;
    }
    const ref = collection(votifyDb, `${sessionID}:played`);
    const unsubscribe = onSnapshot(ref, (snapshot) => {
      const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (a.at?.seconds || 0) - (b.at?.seconds || 0));
      setPlayedTracks(list);
    });
    return () => unsubscribe();
  }, [sessionID]);

  // people whose tab actually pinged recently; docs without a stamp yet
  // (someone mid-join) get the benefit of the doubt
  const activeMembers = members.filter(
    (m) => !m.seen || Date.now() - m.seen < SEEN_STALE_MS
  );

  // 4b2. A buzz and a nudge when one of my own songs lands on thin ice.
  useEffect(() => {
    for (const t of nominatedTracks) {
      if (voterId !== (t.nominatedById || t.nominatedBy)) continue;
      if (t.purgatoryAt && !alertedIce.current.has(t.id)) {
        alertedIce.current.add(t.id);
        notify(`"${t.name}" is on thin ice — go rally some votes!`);
        buzz(200);
      }
      if (!t.purgatoryAt) alertedIce.current.delete(t.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nominatedTracks]);

  const npId = nowPlaying ? nowPlaying.id : "";

  // 4d. For logged-in listeners: is the current song already liked?
  useEffect(() => {
    if (!token || !npId) {
      setNpLiked(null);
      return undefined;
    }
    let active = true;
    checkSavedTracks(token, [npId])
      .then((res) => {
        if (active) setNpLiked(!!res[0]);
      })
      .catch(() => {
        if (active) setNpLiked(null);
      });
    return () => {
      active = false;
    };
  }, [token, npId]);

  // 5. The session heartbeat. The host publishes playback, a borrow token, and
  //    the order mode; hands the next song to Spotify just before the current
  //    one ends; and enforces the thin ice timers. Guests read everything.
  useEffect(() => {
    if (!sessionID) return undefined;
    if (role === "host" && !token) return undefined;
    let cancelled = false;
    const dataRef = doc(votifyDb, `${sessionID}:data`, `${sessionID}`);
    const trackDoc = (id) => doc(votifyDb, `${sessionID}:tracks`, id);

    const tick = async () => {
      try {
        // everyone: refresh my member doc so the room knows I'm still here
        if (user && Date.now() - lastSeenWrite.current > SEEN_EVERY_MS) {
          lastSeenWrite.current = Date.now();
          setDoc(
            memberDoc(sessionID),
            { name: user, host: role === "host", lastSeen: new Date() },
            { merge: true }
          ).catch(() => {});
        }

        // figure out who referees this tick: the host normally, or the
        // first active guest (on the borrowed token) if the host went quiet
        let refereeToken = null;

        if (role === "host") {
          if (lastPublishedToken.current !== token) {
            lastPublishedToken.current = token;
            await setDoc(dataRef, { hostToken: token }, { merge: true });
          }
          if (Date.now() - lastBeatWrite.current > BEAT_EVERY_MS) {
            lastBeatWrite.current = Date.now();
            try {
              await updateDoc(dataRef, { hostBeat: new Date() });
            } catch (e) {
              // updateDoc refuses on a missing doc: the room was closed,
              // probably by a newer session on another device
              const still = await getDoc(dataRef);
              if (!still.exists()) {
                if (!cancelled) {
                  leaveSeat();
                  notify("This room was closed from another device.");
                }
                return;
              }
            }
          }
          refereeToken = token;
        } else {
          const snap = await getDoc(dataRef);
          const data = snap.data();
          if (!data) {
            // a few misses in a row means the room is really gone
            missingRoom.current += 1;
            if (missingRoom.current >= 3 && !cancelled) {
              leaveSeat();
              notify("This room was closed by the host.");
            }
            return;
          }
          missingRoom.current = 0;
          if (data.hostToken && data.hostToken !== hostToken && !cancelled) {
            setHostToken(data.hostToken);
          }
          const borrow = data.hostToken || hostToken;
          if (data.nowPlaying && borrow && lastNowPlayingId.current !== data.nowPlaying) {
            try {
              const details = await getTrack(borrow, data.nowPlaying);
              if (!cancelled) {
                setNowPlaying(details);
                // only mark it handled once the lookup worked, so a failed
                // fetch right after a refresh retries on the next tick
                lastNowPlayingId.current = data.nowPlaying;
              }
            } catch (e) {
              console.error("Now playing lookup failed:", e);
            }
          }
          if (!cancelled) setEndsAt(data.endsAt || null);
          const mode = data.orderMode || "added";
          if (!cancelled && mode !== orderModeRef.current) {
            setOrderMode(mode);
          }
          const rules = { ...DEFAULT_SETTINGS, ...(data.settings || {}) };
          if (
            !cancelled &&
            JSON.stringify(rules) !== JSON.stringify(settingsRef.current)
          ) {
            setSettings(rules);
          }
          const locked = data.lastLocked;
          if (locked && locked.at && !cancelled) {
            const ms = tsMs(locked.at);
            // only flash fresh dispatches, and each one only once
            if (ms > lastLockedAt.current && Date.now() - ms < 20000) {
              lastLockedAt.current = ms;
              showLocked(locked.name);
              if (locked.by && locked.by === voterId) {
                notify(`"${locked.name}" locked in — that was your pick!`);
                buzz([100, 60, 100]);
              }
            }
          }

          // host heartbeat check: stale means the deputy steps up, and the
          // deputy is simply the first active guest by member id — everyone
          // computes the same answer without talking to each other
          const beatMs = tsMs(data.hostBeat);
          const hostStale = !beatMs || Date.now() - beatMs > HOST_STALE_MS;
          const depMs = tsMs(data.deputyBeat);
          const depFresh = depMs > 0 && Date.now() - depMs < HOST_STALE_MS;
          let mine = false;
          if (hostStale && borrow) {
            const eligible = membersRef.current
              .filter(
                (m) =>
                  !m.host && m.seen && Date.now() - m.seen < SEEN_STALE_MS
              )
              .map((m) => m.id)
              .sort();
            mine = eligible.length > 0 && eligible[0] === `member_${voterId}`;
          }
          if (!cancelled) {
            setHostAway(hostStale && !depFresh && !mine);
            setAutopilot(hostStale && (mine || depFresh));
          }
          if (mine) {
            refereeToken = borrow;
            if (Date.now() - lastBeatWrite.current > BEAT_EVERY_MS) {
              lastBeatWrite.current = Date.now();
              await setDoc(dataRef, { deputyBeat: new Date() }, { merge: true });
            }
          }
        }

        if (!refereeToken) return;

        const playback = await getNowPlaying(refereeToken);
        if (playback && playback.item) {
          if (!cancelled) setNowPlaying(playback.item);
          if (lastNowPlayingId.current !== playback.item.id) {
            lastNowPlayingId.current = playback.item.id;
            // update, never create: a closed room must stay closed
            await updateDoc(dataRef, { nowPlaying: playback.item.id });
          }
        }

        // publish a rough song-end time so everyone can see roughly when
        // the top of the queue locks in
        let ends = 0;
        if (playback && playback.item && playback.is_playing) {
          ends =
            Date.now() +
            ((playback.item.duration_ms || 0) - (playback.progress_ms || 0));
        }
        if (!cancelled) setEndsAt(ends || null);
        if (
          lastEndsAt.current === null ||
          Math.abs(ends - lastEndsAt.current) > 3000
        ) {
          lastEndsAt.current = ends;
          await updateDoc(dataRef, { endsAt: ends });
        }

        {
          const rules = settingsRef.current;
          const tracks = tracksRef.current;
          const queued = orderTracks(
            tracks.filter((t) => trackScore(t) > 0 && !t.purgatoryAt),
            orderModeRef.current
          );

          // any removal double-checks a fresh read first: our snapshot can
          // be a few seconds stale, and votes cast in that window count
          const freshRead = async (id) => {
            const snap = await getDoc(trackDoc(id));
            return snap.exists() ? snap.data() : null;
          };

          // trashed songs go in the graveyard so they can't come right back
          const buryTrack = async (id) => {
            try {
              const room = await getDoc(dataRef);
              if (!room.exists()) return; // closed room stays closed
              await setDoc(
                dataRef,
                { graveyard: { [id]: new Date() } },
                { merge: true }
              );
            } catch (e) {}
          };

          // note a song the room locked in, for the banner and the recap
          const logLocked = async (t) => {
            const stamp = new Date();
            setDoc(doc(votifyDb, `${sessionID}:played`, `${stamp.getTime()}_${t.id}`), {
              trackID: t.id,
              name: t.name || "",
              artist: (t.artists || []).map((a) => a.name).join(", "),
              image: t.album?.images?.[0]?.url || "",
              at: stamp,
            }).catch(() => {});
            updateDoc(dataRef, {
              lastLocked: {
                name: t.name || "",
                at: stamp,
                by: t.nominatedById || "",
              },
            }).catch(() => {});
            lastLockedAt.current = stamp.getTime();
            if (!cancelled) {
              showLocked(t.name);
              if ((t.nominatedById || t.nominatedBy) === voterId) {
                notify(`"${t.name}" locked in — that was your pick!`);
                buzz([100, 60, 100]);
              }
            }
          };

          // the host is the referee: songs at or below the kill score go
          // immediately, songs at zero get stamped onto thin ice, and songs
          // that reach the rescue score get their stamp (and penalties) back
          for (const t of tracks) {
            const s = trackScore(t);
            if (s <= rules.killScore) {
              const fresh = await freshRead(t.id);
              if (fresh && trackScore(fresh) <= rules.killScore) {
                await deleteDoc(trackDoc(t.id));
                buryTrack(t.id);
              }
              continue;
            }
            if (
              s >= rules.rescueScore &&
              (t.purgatoryAt || (t.penalizedBy || []).length)
            ) {
              await updateDoc(trackDoc(t.id), {
                purgatoryAt: null,
                penalizedBy: [],
              });
            } else if (s <= 0 && !t.purgatoryAt) {
              await updateDoc(trackDoc(t.id), { purgatoryAt: new Date() });
            }
          }

          // thin ice: when time runs out, anything above zero rejoins the
          // queue, negative scores are removed, and a zero only plays if
          // nothing else is queued, otherwise it's trashed
          for (const t of tracks.filter((t) => t.purgatoryAt)) {
            if (purgatoryRemaining(t, rules) > 0) continue;
            const fresh = await freshRead(t.id);
            if (!fresh || !fresh.purgatoryAt) continue; // gone or rescued
            if (purgatoryRemaining(fresh, rules) > 0) continue; // clock reset
            const s = trackScore(fresh);
            if (s > 0) {
              await updateDoc(trackDoc(t.id), {
                purgatoryAt: null,
                penalizedBy: [],
              });
              continue;
            }
            if (s === 0 && queued.length === 0) {
              try {
                await addTrackToQueue(refereeToken, t.id);
              } catch (e) {
                continue; // no active player yet, try again next tick
              }
              await deleteDoc(trackDoc(t.id));
              logLocked(t);
              continue;
            }
            await deleteDoc(trackDoc(t.id));
            buryTrack(t.id);
          }

          // hand the next queued song to Spotify right before this one ends
          if (
            playback &&
            playback.item &&
            playback.is_playing &&
            queued.length > 0
          ) {
            const left =
              (playback.item.duration_ms || 0) - (playback.progress_ms || 0);
            if (
              left > 0 &&
              left < DISPATCH_WINDOW_MS &&
              dispatchedFor.current !== playback.item.id
            ) {
              // claim the handoff in the session doc first, so a host and a
              // deputy overlapping for a moment can't both send a song
              const claim = await getDoc(dataRef);
              if (
                claim.exists() &&
                claim.data().dispatchedFor === playback.item.id
              ) {
                dispatchedFor.current = playback.item.id;
              } else {
                await updateDoc(dataRef, {
                  dispatchedFor: playback.item.id,
                });
                dispatchedFor.current = playback.item.id;
                const next = queued[0];
                try {
                  await addTrackToQueue(refereeToken, next.id);
                  await deleteDoc(trackDoc(next.id));
                  logLocked(next);
                } catch (e) {
                  dispatchedFor.current = null;
                  await updateDoc(dataRef, { dispatchedFor: null }).catch(
                    () => {}
                  );
                  console.error("Dispatch failed:", e);
                }
              }
            }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, token, hostToken, sessionID, user]);

  const logout = () => {
    setToken("");
    setUser("");
    setRole("");
    setSessionID("");
    setSessionLeader("");
    setNowPlaying(null);
    setEndsAt(null);
    setHostToken("");
    setOrderMode("added");
    lastNowPlayingId.current = null;
    lastPublishedToken.current = null;
    lastEndsAt.current = null;
    dispatchedFor.current = null;
    Object.values(LS).forEach(clearLS);
  };

  // wipe one of my finished sessions so old rooms don't pile up in Firestore
  const cleanupSession = async (oldId) => {
    try {
      const snap = await getDoc(doc(votifyDb, `${oldId}:data`, oldId));
      if (
        snap.exists() &&
        snap.data().leaderId &&
        snap.data().leaderId !== spotifyId
      ) {
        return; // somehow not mine, leave it alone
      }
      for (const path of [`${oldId}:tracks`, `${oldId}:played`, `${oldId}:data`]) {
        const docs = await getDocs(collection(votifyDb, path));
        for (const d of docs.docs) {
          await deleteDoc(doc(votifyDb, path, d.id));
        }
      }
    } catch (e) {}
  };

  const handleStartSession = async () => {
    if (!token || !user) return;
    try {
      // one room per account: if this Spotify account already has a session
      // open anywhere (this device or another), close it first
      const registry = doc(votifyDb, "votify:hosts", spotifyId);
      try {
        const reg = await getDoc(registry);
        if (reg.exists() && reg.data().sessionID) {
          await cleanupSession(reg.data().sessionID);
        }
      } catch (e) {}

      const id = String(Math.floor(1000 + Math.random() * 9000));
      await setDoc(doc(votifyDb, `${id}:data`, id), {
        sessionID: id,
        leader: user,
        leaderId: spotifyId,
        hostToken: token,
        orderMode: "added",
        settings: DEFAULT_SETTINGS,
      });
      await setDoc(memberDoc(id), { name: user, host: true });
      setDoc(registry, { sessionID: id, at: new Date() }).catch(() => {});

      // tidy up whatever rooms this browser hosted before
      let previous = [];
      try {
        previous = JSON.parse(readLS(MY_SESSIONS_KEY) || "[]");
      } catch (e) {}
      previous.filter((old) => old !== id).forEach((old) => cleanupSession(old));
      writeLS(MY_SESSIONS_KEY, JSON.stringify([id]));

      setRole("host");
      setSessionID(id);
      setSessionLeader(user);
      setOrderMode("added");
      setSettings(DEFAULT_SETTINGS);
      lastNowPlayingId.current = null;
      lastPublishedToken.current = token;
      dispatchedFor.current = null;
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
    if (!id || joining) return;
    const name = guestName.trim() || randomGuest();
    setJoining(true);
    try {
      const snap = await getDoc(doc(votifyDb, `${id}:data`, id));
      if (!snap.exists()) {
        setError(`No session found with code ${id}.`);
        return;
      }
      const data = snap.data();

      // entering your own room's code takes the host seat back
      const isMyRoom =
        token &&
        (data.leaderId ? data.leaderId === spotifyId : data.leader === user);
      if (isMyRoom) {
        setDoc(memberDoc(id), { name: data.leader || user, host: true }).catch(
          () => {}
        );
        setRole("host");
        setSessionID(id);
        setSessionLeader(data.leader || user);
        setOrderMode(data.orderMode || "added");
        setSettings({ ...DEFAULT_SETTINGS, ...(data.settings || {}) });
        lastNowPlayingId.current = null;
        lastPublishedToken.current = null; // republish a fresh token next tick
        dispatchedFor.current = null;
        writeLS(LS.role, "host");
        writeLS(LS.sessionID, id);
        writeLS(LS.leader, data.leader || user);
        setSessionIdInput("");
        setError(null);
        return;
      }

      setDoc(memberDoc(id), { name, host: false }).catch(() => {});
      setRole("guest");
      setSessionID(id);
      setSessionLeader(data.leader || "");
      setHostToken(data.hostToken || "");
      setOrderMode(data.orderMode || "added");
      setSettings({ ...DEFAULT_SETTINGS, ...(data.settings || {}) });
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
    } finally {
      setJoining(false);
    }
  };

  const handleLeaveSession = () => {
    if (role === "host") {
      const sure = window.confirm(
        `Leave your own session? Voting pauses until you take it back by entering code ${sessionID} under Join.`
      );
      if (!sure) return;
    }
    leaveSeat();
  };

  // drop the current seat without asking; also used when the room turns out
  // to have been closed from somewhere else
  const leaveSeat = () => {
    const wasGuest = role === "guest";
    if (sessionID) deleteDoc(memberDoc(sessionID)).catch(() => {});
    setSessionID("");
    setSessionLeader("");
    setNowPlaying(null);
    setEndsAt(null);
    setHostToken("");
    setOrderMode("added");
    setSettings(DEFAULT_SETTINGS);
    setSearchOpen(false);
    setResults([]);
    setRole("");
    setShowMembers(false);
    setShowSettings(false);
    setShowQr(false);
    setShowAddTo(false);
    setNpLiked(null);
    setLockedIn(null);
    setSaveState({ status: "idle", url: "" });
    setHostAway(false);
    setAutopilot(false);
    setToast(null);
    setJoining(false);
    alertedIce.current.clear();
    lastBeatWrite.current = 0;
    lastSeenWrite.current = 0;
    lastLockedAt.current = 0;
    missingRoom.current = 0;
    setNomTab("search");
    setPlaylists(null);
    setActivePlaylist(null);
    setLikedTracks(null);
    setLibNote(null);
    lastNowPlayingId.current = null;
    lastEndsAt.current = null;
    dispatchedFor.current = null;
    if (wasGuest) setUser("");
    [LS.role, LS.sessionID, LS.leader, LS.name].forEach(clearLS);
  };

  const handleOrderMode = (mode) => {
    if (role !== "host" || mode === orderMode) return;
    setOrderMode(mode);
    setDoc(
      doc(votifyDb, `${sessionID}:data`, `${sessionID}`),
      { orderMode: mode },
      { merge: true }
    ).catch((e) => console.error("Order mode update failed:", e));
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!apiToken || !searchKey.trim()) return;
    try {
      setResults(await searchTracks(apiToken, searchKey.trim()));
    } catch (err) {
      console.error("Search failed:", err);
      notify("Search failed. Try again.");
    }
  };

  // 6b. Search as you type: results follow the box after a short pause.
  useEffect(() => {
    if (!searchOpen || nomTab !== "search") return undefined;
    const q = searchKey.trim();
    if (!apiToken || !q) {
      setResults([]);
      return undefined;
    }
    const timer = setTimeout(async () => {
      try {
        setResults(await searchTracks(apiToken, q));
      } catch (e) {
        console.error("Search failed:", e);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [searchKey, searchOpen, nomTab, apiToken]);

  // nominating counts as your upvote, so a new song goes straight to the queue
  const handleNominate = async (track) => {
    try {
      // recently trashed songs wait out the room's cooldown first
      const cooldownMs = (settingsRef.current.trashCooldownMin || 0) * 60000;
      if (cooldownMs > 0) {
        const snap = await getDoc(
          doc(votifyDb, `${sessionID}:data`, sessionID)
        );
        const buried = snap.exists()
          ? (snap.data().graveyard || {})[track.id]
          : null;
        if (buried) {
          const ms =
            typeof buried.toDate === "function"
              ? buried.toDate().getTime()
              : 0;
          if (Date.now() - ms < cooldownMs) {
            const wait = Math.ceil((cooldownMs - (Date.now() - ms)) / 60000);
            notify(
              `The room already voted "${track.name}" off — it can come back in ${wait} min.`
            );
            return;
          }
        }
      }

      // already in the room? give it your upvote instead of resetting it
      const existSnap = await getDoc(
        doc(votifyDb, `${sessionID}:tracks`, track.id)
      );
      if (existSnap.exists()) {
        const existing = { id: track.id, ...existSnap.data() };
        if (voterId === (existing.nominatedById || existing.nominatedBy)) {
          notify("That one's already your nomination.");
        } else {
          castVote(existing, true);
          notify(`"${track.name}" is already queued — gave it your upvote.`);
        }
        return;
      }

      await setDoc(doc(votifyDb, `${sessionID}:tracks`, track.id), {
        trackID: track.id,
        nominatedBy: user,
        nominatedById: voterId,
        upvotes: [voterId],
        downvotes: [],
        timestamp: new Date(),
        purgatoryAt: null,
        penalizedBy: [],
      });
    } catch (e) {
      console.error("Nominate failed:", e);
      notify("Couldn't nominate that track. Try again.");
    }
  };

  // votes are atomic field updates so simultaneous voters can't overwrite
  // each other; the host's heartbeat handles queue/thin ice transitions
  const castVote = (track, up) => {
    if (voterId === (track.nominatedById || track.nominatedBy)) return;
    const update = up
      ? { upvotes: arrayUnion(voterId), downvotes: arrayRemove(voterId) }
      : { upvotes: arrayRemove(voterId), downvotes: arrayUnion(voterId) };
    // a downvote on thin ice costs the song a minute; arrayUnion means one
    // person can never stack penalties
    if (!up && track.purgatoryAt) {
      update.penalizedBy = arrayUnion(voterId);
    }
    // an upvote that rescues the song clears its stamp right away
    if (up && track.purgatoryAt) {
      const ups =
        (track.upvotes || []).filter((u) => u !== voterId).length + 1;
      const downs = (track.downvotes || []).filter((u) => u !== voterId).length;
      if (ups - downs >= settingsRef.current.rescueScore) {
        update.purgatoryAt = null;
        update.penalizedBy = [];
      }
    }
    // show the vote immediately; the server echo confirms it a beat later
    setNominatedTracks((prev) =>
      prev.map((t) => {
        if (t.id !== track.id) return t;
        const ups = (t.upvotes || []).filter((u) => u !== voterId);
        const downs = (t.downvotes || []).filter((u) => u !== voterId);
        if (up) ups.push(voterId);
        else downs.push(voterId);
        return { ...t, upvotes: ups, downvotes: downs };
      })
    );
    updateDoc(doc(votifyDb, `${sessionID}:tracks`, track.id), update).catch(
      (e) => {
        console.error("Vote failed:", e);
        notify("That vote didn't go through — try again.");
      }
    );
  };

  const nominatedIds = nominatedTracks.map((t) => t.id);
  const queuedTracks = orderTracks(
    nominatedTracks.filter((t) => trackScore(t) > 0 && !t.purgatoryAt),
    orderMode
  );
  const thinIceTracks = nominatedTracks.filter(
    (t) => trackScore(t) <= 0 || t.purgatoryAt
  );

  // prefilled text message invite; the button only shows on small screens
  const inviteLink = () => {
    const url = `${window.location.origin}/projects/votify?join=${sessionID}`;
    const msg = `Help pick what plays next! Join my Votify room with code ${sessionID}: ${url}`;
    return `sms:?&body=${encodeURIComponent(msg)}`;
  };

  // library tabs: only people logged into Spotify get these, and older logins
  // may be missing the library scopes until they log in again
  const libError = (e) => {
    if (e.response && e.response.status === 403) {
      setLibNote(
        "Your Spotify login doesn't have library access yet. Log out and back in to grant it."
      );
    } else {
      setLibNote("Couldn't load that from Spotify. Try again.");
    }
  };

  const openTab = async (tab) => {
    setNomTab(tab);
    setLibNote(null);
    try {
      if (tab === "playlists" && playlists === null) {
        setPlaylists(await getMyPlaylists(token));
      }
      if (tab === "liked" && likedTracks === null) {
        const items = await getSavedTracks(token, 0);
        setLikedTracks(items);
        setLikedDone(items.length < 50);
      }
    } catch (e) {
      libError(e);
    }
  };

  const openPlaylist = async (playlist) => {
    try {
      setActivePlaylist(playlist);
      setPlaylistTracks(await getPlaylistTracks(token, playlist.id));
      setLibNote(null);
    } catch (e) {
      setActivePlaylist(null);
      libError(e);
    }
  };

  const loadMoreLiked = async () => {
    try {
      const items = await getSavedTracks(token, likedTracks.length);
      setLikedTracks([...likedTracks, ...items]);
      if (items.length < 50) setLikedDone(true);
    } catch (e) {
      libError(e);
    }
  };

  const closeNominate = () => {
    setSearchOpen(false);
    setResults([]);
    setSearchKey("");
    setNomTab("search");
    setActivePlaylist(null);
    setLibNote(null);
  };

  // a QR of the invite link, drawn locally so it works with no extra requests
  const openQr = async () => {
    try {
      const url = `${window.location.origin}/projects/votify?join=${sessionID}`;
      setQrData(await QRCode.toDataURL(url, { width: 480, margin: 1 }));
      setShowQr(true);
    } catch (e) {
      console.error("QR failed:", e);
    }
  };

  // turn tonight's setlist into a real playlist on the host's account
  const handleSavePlaylist = async () => {
    if (!token || !spotifyId || playedTracks.length === 0) return;
    setSaveState({ status: "saving", url: "" });
    try {
      const date = new Date().toLocaleDateString(undefined, {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
      const playlist = await createPlaylist(
        token,
        spotifyId,
        `Votify — ${date}`,
        `Everything the room voted onto the speakers in session ${sessionID}.`
      );
      await addTracksToPlaylist(
        token,
        playlist.id,
        playedTracks.map((t) => t.trackID)
      );
      setSaveState({
        status: "done",
        url: playlist.external_urls?.spotify || "",
      });
    } catch (e) {
      console.error("Playlist save failed:", e);
      setSaveState({
        status: "error",
        url: "",
        message:
          e.response && e.response.status === 403
            ? "Your Spotify login can't make playlists yet — log out and back in to grant it."
            : "Couldn't save the playlist. Try again.",
      });
    }
  };

  // the settings form edits a draft so a half-typed number never hits the room
  const openSettings = () => {
    setDraft({
      iceMinutes: String(settings.iceSeconds / 60),
      penaltySeconds: String(settings.penaltySeconds),
      rescueScore: String(settings.rescueScore),
      killScore: String(settings.killScore),
      trashCooldownMin: String(settings.trashCooldownMin),
    });
    setShowSettings(true);
  };

  const saveSettings = () => {
    const clamp = (value, lo, hi, fallback) => {
      const n = Number(value);
      if (!Number.isFinite(n)) return fallback;
      return Math.min(hi, Math.max(lo, Math.round(n)));
    };
    const next = {
      iceSeconds: clamp(draft.iceMinutes, 1, 60, 5) * 60,
      penaltySeconds: clamp(draft.penaltySeconds, 0, 600, 60),
      rescueScore: clamp(draft.rescueScore, 1, 10, 1),
      killScore: clamp(draft.killScore, -20, -1, -3),
      trashCooldownMin: clamp(draft.trashCooldownMin, 0, 240, 30),
    };
    setSettings(next);
    setShowSettings(false);
    setDoc(
      doc(votifyDb, `${sessionID}:data`, `${sessionID}`),
      { settings: next },
      { merge: true }
    ).catch((e) => console.error("Settings update failed:", e));
  };

  // logged-in listeners can act on the current song with their own account
  const actError = (e, what) => {
    if (e.response && e.response.status === 403) {
      notify(
        `Your Spotify login can't ${what} yet — log out and back in to grant it.`
      );
    } else {
      notify(`Couldn't ${what}. Try again.`);
    }
  };

  const toggleLikeNowPlaying = async () => {
    if (!token || !npId) return;
    try {
      if (npLiked) {
        await removeSavedTrack(token, npId);
        setNpLiked(false);
      } else {
        await saveTrack(token, npId);
        setNpLiked(true);
      }
      setError(null);
    } catch (e) {
      actError(e, "save songs");
    }
  };

  const openAddTo = async () => {
    if (!token || !npId) return;
    try {
      if (playlists === null) setPlaylists(await getMyPlaylists(token));
      setAddedTo("");
      setShowAddTo(true);
      setError(null);
    } catch (e) {
      actError(e, "read your playlists");
    }
  };

  const addNowPlayingTo = async (playlist) => {
    try {
      await addTracksToPlaylist(token, playlist.id, [npId]);
      setAddedTo(playlist.id);
    } catch (e) {
      setShowAddTo(false);
      actError(e, "add to that playlist");
    }
  };

  return (
    <div className="votify-page">
      <section className="votify-hero">
        <div className="container">
          <span className="section-label votify-label">
            <FaVoteYea /> Votify
          </span>
          <div className="votify-title-row">
            <img src={VotifyLogo} alt="Votify logo" className="votify-logo" />
            <h1>Vote on what plays next</h1>
          </div>
          <p>
            Host a session, share the code, and let the room pick the music.
            The host logs in with Spotify; everyone else just joins with a name
            and votes.
          </p>
          <button className="votify-info-btn" onClick={() => setShowInfo(true)}>
            <FaInfoCircle /> How it works
          </button>
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
              <p>
                Enter a code to nominate and vote — no login needed.
                {token && " Enter your own room's code to take it back as host."}
              </p>
              <form
                className="votify-join-fields"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleJoinSession();
                }}
              >
                <input
                  className="votify-input"
                  type="text"
                  ref={nameInputRef}
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
                  <button
                    className="votify-btn"
                    type="submit"
                    disabled={joining}
                  >
                    {joining ? "Joining…" : "Join"}
                  </button>
                </div>
              </form>
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
                  className={
                    "votify-members-btn" + (showMembers ? " active" : "")
                  }
                  onClick={() => setShowMembers((v) => !v)}
                  title="Who's here"
                >
                  <FaUsers /> {activeMembers.length}
                </button>
                {role === "host" && (
                  <button
                    className="votify-members-btn"
                    onClick={openSettings}
                    title="Room settings"
                    aria-label="Room settings"
                  >
                    <FaCog />
                  </button>
                )}
                <button
                  className="votify-members-btn"
                  onClick={openQr}
                  title="Show a QR code to join"
                  aria-label="Show a QR code to join"
                >
                  <FaQrcode />
                </button>
                <a className="votify-btn votify-invite" href={inviteLink()}>
                  <FaCommentDots /> Invite by text
                </a>
                <button
                  className="votify-btn"
                  onClick={() =>
                    searchOpen ? closeNominate() : setSearchOpen(true)
                  }
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

            {showMembers && (
              <div className="votify-members">
                <span className="section-label">
                  {activeMembers.length} in the room
                </span>
                <ul>
                  {activeMembers.map((m) => (
                    <li key={m.id}>
                      {m.name}
                      {m.host && <span className="votify-host-tag">host</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {(hostAway || (autopilot && role === "guest")) && (
              <div className={"votify-away" + (autopilot ? " autopilot" : "")}>
                {autopilot
                  ? "The host stepped away — the room is running on autopilot until they're back."
                  : "The host stepped away. Votes still count; the queue picks back up when they return."}
              </div>
            )}

            {lockedIn && (
              <div className="votify-locked">
                <FaLock /> Locked in: <strong>{lockedIn}</strong> — the room
                voted it onto the speakers
              </div>
            )}

            {nowPlaying && nowPlaying.album && (
              <NowPlaying
                track={nowPlaying}
                endsAt={endsAt}
                canAct={!!token}
                liked={!!npLiked}
                onLike={toggleLikeNowPlaying}
                onAddTo={openAddTo}
              />
            )}

            {searchOpen && (
              <div className="votify-card votify-search">
                <button
                  type="button"
                  className="votify-dismiss"
                  onClick={closeNominate}
                  aria-label="Close search"
                  title="Close search"
                >
                  <FaTimes />
                </button>

                {token && (
                  <div className="votify-tabs">
                    <button
                      className={
                        "votify-tab" + (nomTab === "search" ? " active" : "")
                      }
                      onClick={() => openTab("search")}
                    >
                      Search
                    </button>
                    <button
                      className={
                        "votify-tab" +
                        (nomTab === "playlists" ? " active" : "")
                      }
                      onClick={() => openTab("playlists")}
                    >
                      My playlists
                    </button>
                    <button
                      className={
                        "votify-tab" + (nomTab === "liked" ? " active" : "")
                      }
                      onClick={() => openTab("liked")}
                    >
                      Liked songs
                    </button>
                  </div>
                )}

                {nomTab === "search" && (
                  <>
                    <form
                      className="votify-search-form"
                      onSubmit={handleSearch}
                    >
                      <input
                        className="votify-input"
                        type="text"
                        value={searchKey}
                        onChange={(e) => setSearchKey(e.target.value)}
                        placeholder="Start typing to search Spotify..."
                      />
                    </form>
                    {!apiToken && (
                      <p className="votify-note">
                        Waiting for the host's connection before search is
                        available…
                      </p>
                    )}
                    {!token && apiToken && (
                      <p className="votify-note">
                        <button
                          type="button"
                          className="votify-inline-link"
                          onClick={() => beginLogin()}
                        >
                          Connect your own Spotify
                        </button>{" "}
                        to search with your account and nominate straight from
                        your playlists and liked songs.
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
                  </>
                )}

                {nomTab === "playlists" && !activePlaylist && (
                  <div className="votify-playlists">
                    {(playlists || []).map((playlist) => (
                      <button
                        key={playlist.id}
                        className="votify-playlist"
                        onClick={() => openPlaylist(playlist)}
                      >
                        {playlist.images?.[0]?.url && (
                          <img
                            src={playlist.images[0].url}
                            alt={playlist.name}
                          />
                        )}
                        <span className="votify-playlist-name">
                          {playlist.name}
                        </span>
                        <span className="votify-playlist-count">
                          {playlist.tracks?.total ?? 0} songs
                        </span>
                      </button>
                    ))}
                    {playlists && playlists.length === 0 && (
                      <p className="votify-note">No playlists found.</p>
                    )}
                  </div>
                )}

                {nomTab === "playlists" && activePlaylist && (
                  <>
                    <button
                      type="button"
                      className="votify-inline-link votify-back"
                      onClick={() => setActivePlaylist(null)}
                    >
                      <FaArrowLeft /> All playlists
                    </button>
                    <p className="votify-note votify-playlist-title">
                      {activePlaylist.name}
                    </p>
                    <div className="votify-results">
                      {playlistTracks.map((track) => (
                        <SearchResult
                          key={track.id}
                          track={track}
                          onNominate={handleNominate}
                          nominated={nominatedIds.includes(track.id)}
                        />
                      ))}
                    </div>
                  </>
                )}

                {nomTab === "liked" && (
                  <>
                    <div className="votify-results">
                      {(likedTracks || []).map((track) => (
                        <SearchResult
                          key={track.id}
                          track={track}
                          onNominate={handleNominate}
                          nominated={nominatedIds.includes(track.id)}
                        />
                      ))}
                    </div>
                    {likedTracks && likedTracks.length > 0 && !likedDone && (
                      <button
                        type="button"
                        className="votify-inline-link votify-more"
                        onClick={loadMoreLiked}
                      >
                        Load more
                      </button>
                    )}
                  </>
                )}

                {libNote && <p className="votify-note">{libNote}</p>}
              </div>
            )}

            <div className="votify-noms">
              <div className="tracks-header">
                <h2>Up next</h2>
                <div className="votify-order">
                  <span>Order</span>
                  <button
                    className={
                      "votify-order-btn" +
                      (orderMode === "added" ? " active" : "")
                    }
                    onClick={() => handleOrderMode("added")}
                    disabled={role !== "host"}
                    title={role !== "host" ? "The host picks the order" : ""}
                  >
                    First come
                  </button>
                  <button
                    className={
                      "votify-order-btn" +
                      (orderMode === "votes" ? " active" : "")
                    }
                    onClick={() => handleOrderMode("votes")}
                    disabled={role !== "host"}
                    title={role !== "host" ? "The host picks the order" : ""}
                  >
                    Most votes
                  </button>
                </div>
              </div>
              {queuedTracks.length === 0 ? (
                <p className="votify-empty">
                  Nothing queued. Hit “Search &amp; nominate” to add the first
                  track.
                </p>
              ) : (
                <div className="votify-noms-list">
                  {queuedTracks.map((track, i) => (
                    <SessionTrack
                      key={track.id}
                      track={track}
                      position={i + 1}
                      voter={voterId}
                      onVote={castVote}
                      rules={settings}
                    />
                  ))}
                </div>
              )}
            </div>

            {thinIceTracks.length > 0 && (
              <div className="votify-ice">
                <div className="tracks-header">
                  <h2>On thin ice</h2>
                  <span className="votify-count">
                    out of votes, running out of time
                  </span>
                </div>
                <div className="votify-noms-list">
                  {thinIceTracks.map((track) => (
                    <SessionTrack
                      key={track.id}
                      track={track}
                      voter={voterId}
                      onVote={castVote}
                      purgatory
                      rules={settings}
                    />
                  ))}
                </div>
              </div>
            )}

            {playedTracks.length > 0 && (
              <div className="votify-played">
                <div className="tracks-header">
                  <h2>Played tonight</h2>
                  <span className="votify-count">
                    {playedTracks.length}{" "}
                    {playedTracks.length === 1 ? "song" : "songs"} locked in
                  </span>
                </div>
                <ol className="votify-played-list">
                  {playedTracks.map((t) => (
                    <li key={t.id}>
                      {t.image && <img src={t.image} alt="" />}
                      <span className="votify-played-name">{t.name}</span>
                      <span className="votify-played-artist">{t.artist}</span>
                    </li>
                  ))}
                </ol>
                {role === "host" && (
                  <div className="votify-save">
                    {saveState.status === "done" ? (
                      <p className="votify-note">
                        Saved to your Spotify.{" "}
                        {saveState.url && (
                          <a
                            href={saveState.url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Open the playlist
                          </a>
                        )}
                      </p>
                    ) : (
                      <button
                        className="votify-btn"
                        onClick={handleSavePlaylist}
                        disabled={saveState.status === "saving"}
                      >
                        <FaSpotify />{" "}
                        {saveState.status === "saving"
                          ? "Saving…"
                          : "Save tonight to a playlist"}
                      </button>
                    )}
                    {saveState.status === "error" && (
                      <p className="votify-note">{saveState.message}</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <p className="votify-footnote">
          Votify started as its own app back in 2024.{" "}
          <a
            href="https://github.com/pattisonb/votify"
            target="_blank"
            rel="noopener noreferrer"
          >
            Check out the original code
          </a>{" "}
          if you want to see where it came from.
        </p>
      </div>

      {showSettings && draft && (
        <div
          className="votify-modal-overlay"
          onClick={() => setShowSettings(false)}
        >
          <div
            className="votify-modal"
            role="dialog"
            aria-label="Room settings"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="votify-dismiss"
              onClick={() => setShowSettings(false)}
              aria-label="Close"
            >
              <FaTimes />
            </button>
            <h2>Room settings</h2>
            <p>These apply to everyone in the room right away.</p>
            <div className="votify-settings-form">
              <label>
                Thin ice timer (minutes)
                <input
                  className="votify-input"
                  type="number"
                  min="1"
                  max="60"
                  value={draft.iceMinutes}
                  onChange={(e) =>
                    setDraft({ ...draft, iceMinutes: e.target.value })
                  }
                />
              </label>
              <label>
                Time each downvote costs (seconds)
                <input
                  className="votify-input"
                  type="number"
                  min="0"
                  max="600"
                  step="15"
                  value={draft.penaltySeconds}
                  onChange={(e) =>
                    setDraft({ ...draft, penaltySeconds: e.target.value })
                  }
                />
              </label>
              <label>
                Score that saves a song from the ice
                <input
                  className="votify-input"
                  type="number"
                  min="1"
                  max="10"
                  value={draft.rescueScore}
                  onChange={(e) =>
                    setDraft({ ...draft, rescueScore: e.target.value })
                  }
                />
              </label>
              <label>
                Score that removes a song instantly
                <input
                  className="votify-input"
                  type="number"
                  min="-20"
                  max="-1"
                  value={draft.killScore}
                  onChange={(e) =>
                    setDraft({ ...draft, killScore: e.target.value })
                  }
                />
              </label>
              <label>
                Wait before a trashed song can return (minutes)
                <input
                  className="votify-input"
                  type="number"
                  min="0"
                  max="240"
                  value={draft.trashCooldownMin}
                  onChange={(e) =>
                    setDraft({ ...draft, trashCooldownMin: e.target.value })
                  }
                />
              </label>
              <button className="votify-btn" onClick={saveSettings}>
                Save settings
              </button>
            </div>
          </div>
        </div>
      )}

      {showQr && (
        <div className="votify-modal-overlay" onClick={() => setShowQr(false)}>
          <div
            className="votify-modal votify-qr"
            role="dialog"
            aria-label="QR code to join this session"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="votify-dismiss"
              onClick={() => setShowQr(false)}
              aria-label="Close"
            >
              <FaTimes />
            </button>
            <h2>Scan to join</h2>
            {qrData && (
              <img src={qrData} alt={`QR code for session ${sessionID}`} />
            )}
            <p>
              Point a phone camera here, or enter code{" "}
              <span className="votify-code">{sessionID}</span> on this page.
            </p>
          </div>
        </div>
      )}

      {showAddTo && (
        <div
          className="votify-modal-overlay"
          onClick={() => setShowAddTo(false)}
        >
          <div
            className="votify-modal"
            role="dialog"
            aria-label="Add the current song to one of your playlists"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="votify-dismiss"
              onClick={() => setShowAddTo(false)}
              aria-label="Close"
            >
              <FaTimes />
            </button>
            <h2>Add to one of your playlists</h2>
            <p>{nowPlaying ? nowPlaying.name : ""}</p>
            <div className="votify-playlists">
              {(playlists || [])
                .filter(
                  (p) =>
                    !p.owner || p.owner.id === spotifyId || p.collaborative
                )
                .map((playlist) => (
                  <button
                    key={playlist.id}
                    className="votify-playlist"
                    onClick={() => addNowPlayingTo(playlist)}
                    disabled={addedTo === playlist.id}
                  >
                    {playlist.images?.[0]?.url && (
                      <img src={playlist.images[0].url} alt={playlist.name} />
                    )}
                    <span className="votify-playlist-name">
                      {playlist.name}
                    </span>
                    <span className="votify-playlist-count">
                      {addedTo === playlist.id ? "Added" : <FaPlus />}
                    </span>
                  </button>
                ))}
            </div>
            {playlists && playlists.length === 0 && (
              <p className="votify-note">No playlists found.</p>
            )}
          </div>
        </div>
      )}

      {showInfo && (
        <div className="votify-modal-overlay" onClick={() => setShowInfo(false)}>
          <div
            className="votify-modal"
            role="dialog"
            aria-label="How Votify works"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="votify-dismiss"
              onClick={() => setShowInfo(false)}
              aria-label="Close"
            >
              <FaTimes />
            </button>
            <h2>How Votify works</h2>
            <h3>One person hosts</h3>
            <p>
              The host logs in with Spotify, starts a session, and shares the
              code. Music plays from their Spotify like normal, so hosting
              needs Premium. Everyone else just enters the code and a name.
            </p>
            <h3>Nominate anything</h3>
            <p>
              Search for a song and nominate it. It jumps straight into the
              queue with your upvote attached.
            </p>
            <h3>Vote it up or down</h3>
            <p>
              One vote per person per song, and you can change your mind any
              time. The host picks whether the queue runs first come first
              served or by most votes.
            </p>
            <h3>Thin ice</h3>
            <p>
              A song that drops to zero or below lands on thin ice with a
              timer, and every fresh downvote cuts it shorter. Climb back up
              and it rejoins the queue; sink far enough and it's removed on
              the spot. When time runs out, a negative song is gone for good
              and a song at exactly zero only plays if nothing else is
              waiting. The host sets the exact numbers in the room settings.
            </p>
            <h3>The handoff</h3>
            <p>
              As the current song winds down, whatever is on top of the queue
              gets sent to the host's Spotify, and the room starts voting on
              the next slot.
            </p>
          </div>
        </div>
      )}

      {toast && <div className="votify-toast">{toast}</div>}
    </div>
  );
}

export default Votify;
