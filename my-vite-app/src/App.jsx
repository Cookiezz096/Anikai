import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  Link,
  Route,
  Routes,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  Play,
  Search,
  User,
  LogIn,
  ChevronRight,
  ChevronLeft,
  Menu,
  X,
  AlertCircle,
  LoaderCircle,
  Plus,
  Tv,
  RotateCcw,
  Maximize2,
  Minimize2,
  Sparkles,
  Check,
  Clapperboard,
  Star,
  Clock,
  Calendar,
  Layers,
  Server,
  ShieldCheck,
  Bell,
  LogOut,
  Bookmark,
} from "lucide-react";
import {
  getMovie,
  getPopularMovies,
  getPopularTV,
  getSeason,
  getTrending,
  getTV,
  searchMulti,
  tmdbImage,
  getOfficialTrailerUrl,
} from "./lib/tmdb";
import { authConfigured, signInWithProvider, supabase } from "./lib/supabase";
import { getEmbedUrl, isServerPlayable, getSourceHealthKey, AD_QUALITY, isAdQualityAcceptable } from "./data/sources";
import { reportRuntimePlaybackIssue, getSourceHealth } from "./data/serverHealthService";
import EnhancedEmbedPlayer from "./components/EnhancedEmbedPlayer";
import AutoNextOverlay from "./components/AutoNextOverlay";
import SkipTimingsOverlay from "./components/SkipTimingsOverlay";
import { rankSources, getBestSourceIndex, allSourcesExcessive } from "./utils/serverRanking";
import { useServerHealth } from "./utils/useServerHealth";
import {
  getWatchProgress,
  getAllWatchProgress,
  setPreferredServer,
  setPreferredAudio,
  getPreferredAudio,
  getAutoplayNext,
  setAutoplayNext,
  recordServerFailure,
} from "./utils/watchHistory";
import {
  getMediaReleaseData,
  CUSTOM_MEDIA_DATABASE,
} from "./data/animeData";
import { getCategoryStatus, STATUS_TYPES } from "./utils/releaseUtils";
import ReleaseCountdown from "./components/ReleaseCountdown";
import ReleaseStatusBadge from "./components/ReleaseStatusBadge";
import StreamingSources from "./components/StreamingSources";
import SubtitleSelector from "./components/SubtitleSelector";
import UpcomingOverlay from "./components/UpcomingOverlay";
import EpisodeAvailability from "./components/EpisodeAvailability";
import NotificationPanel from "./components/NotificationPanel";
import { useNotifications } from "./utils/useNotifications";
import LegalWatchProviders from "./components/LegalWatchProviders";
import MediaWatchlistTracker from "./components/MediaWatchlistTracker";
import WatchlistDashboard from "./components/WatchlistDashboard";

const fallback = "https://placehold.co/600x900/101217/ffffff?text=No+Poster";


/* ─── Auth hook ─────────────────────────────────────────────────────────── */
function useAuth() {
  const [session, setSession] = useState(null);
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_e, s) =>
      setSession(s)
    );
    return () => listener.subscription.unsubscribe();
  }, []);
  return session;
}

/* ─── Navigation Live Search ─────────────────────────────────────────── */
function NavSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setIsOpen(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    setIsOpen(true);
    const timer = setTimeout(() => {
      searchMulti(trimmed)
        .then((res) => {
          const items = (res.results || [])
            .filter(
              (item) =>
                item.media_type === "movie" ||
                item.media_type === "tv" ||
                (!item.media_type && (item.title || item.name))
            )
            .slice(0, 7);
          setResults(items);
        })
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  function handleSubmit(e) {
    if (e) e.preventDefault();
    if (query.trim()) {
      setIsOpen(false);
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  }

  function handleSelect(item) {
    const type = item.media_type || (item.first_air_date ? "tv" : "movie");
    setIsOpen(false);
    setQuery("");
    navigate(`/watch/${type}/${item.id}`);
  }

  return (
    <div className="nav-search-container" ref={wrapperRef}>
      <form className="search" onSubmit={handleSubmit}>
        <Search size={18} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (query.trim() && results.length > 0) setIsOpen(true);
          }}
          placeholder="Search movies, shows..."
        />
        {loading ? (
          <LoaderCircle size={16} className="spin search-loading-icon" />
        ) : query ? (
          <button
            type="button"
            className="search-clear-btn"
            onClick={() => {
              setQuery("");
              setResults([]);
              setIsOpen(false);
            }}
          >
            <X size={15} />
          </button>
        ) : null}
      </form>

      {isOpen && (
        <div className="search-dropdown">
          {loading && results.length === 0 ? (
            <div className="search-status">
              <LoaderCircle size={16} className="spin" /> Searching...
            </div>
          ) : results.length > 0 ? (
            <>
              <div className="search-results-list">
                {results.map((item) => {
                  const type =
                    item.media_type || (item.first_air_date ? "tv" : "movie");
                  const title = item.title || item.name;
                  const year = (
                    item.release_date || item.first_air_date || ""
                  ).slice(0, 4);
                  return (
                    <div
                      key={`${type}-${item.id}`}
                      className="search-result-item"
                      onClick={() => handleSelect(item)}
                    >
                      <img
                        src={tmdbImage(item.poster_path, "w92") || fallback}
                        alt={title}
                        className="search-result-thumb"
                      />
                      <div className="search-result-info">
                        <div className="search-result-title">{title}</div>
                        <div className="search-result-meta">
                          <span className={`search-badge ${type}`}>
                            {type === "tv" ? "TV" : "Movie"}
                          </span>
                          {year && <span>{year}</span>}
                          {item.vote_average > 0 && (
                            <span className="search-rating">
                              ★ {item.vote_average.toFixed(1)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="search-view-all" onClick={handleSubmit}>
                View all results for &ldquo;{query}&rdquo; &rarr;
              </div>
            </>
          ) : (
            <div className="search-status">
              No results for &ldquo;{query}&rdquo;
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Layout ─────────────────────────────────────────────────────────────── */
function Layout({ children }) {
  const session = useAuth();
  const navigate = useNavigate();
  const [menu, setMenu] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const dropdownRef = useRef(null);
  const notifRef = useRef(null);

  const {
    notifications,
    readIds,
    unreadCount,
    markAsRead,
    markAllRead,
  } = useNotifications();

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function logout() {
    setDropdownOpen(false);
    if (supabase) {
      await supabase.auth.signOut();
      navigate("/", { replace: true });
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link className="brand" to="/">
          <span className="brand-mark">A</span> Ani<span>kai</span>
        </Link>
        <nav className={menu ? "nav open" : "nav"}>
          <Link to="/" onClick={() => setMenu(false)}>Home</Link>
          <Link to="/movies" onClick={() => setMenu(false)}>Movies</Link>
          <Link to="/tv" onClick={() => setMenu(false)}>TV Shows</Link>
          {session && (
            <Link to="/profile" onClick={() => setMenu(false)}>My List</Link>
          )}
        </nav>
        <NavSearch />
        <div className="account-actions">
          {/* Notification Bell Dropdown */}
          <div className="notification-dropdown-container" ref={notifRef}>
            <button
              className={`notification-btn ${notifOpen ? "active" : ""}`}
              onClick={() => {
                setNotifOpen((v) => !v);
                setDropdownOpen(false);
              }}
              title="Release Notifications"
              aria-label="Release Notifications"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="notification-badge">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <NotificationPanel
                notifications={notifications}
                readIds={readIds}
                unreadCount={unreadCount}
                onMarkAsRead={markAsRead}
                onMarkAllRead={markAllRead}
                onClose={() => setNotifOpen(false)}
                isDropdown={true}
              />
            )}
          </div>

          {session ? (
            <div className="avatar-dropdown-container" ref={dropdownRef}>
              <button 
                className="avatar-btn" 
                onClick={() => {
                  setDropdownOpen(!dropdownOpen);
                  setNotifOpen(false);
                }}
                onMouseEnter={() => setDropdownOpen(true)}
                title="Account Menu"
              >
                {session.user?.user_metadata?.avatar_url ? (
                  <img
                    src={session.user.user_metadata.avatar_url}
                    alt="Avatar"
                    style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover" }}
                  />
                ) : (
                  <User size={18} />
                )}
              </button>
              
              {dropdownOpen && (
                <div className="avatar-dropdown-menu" onMouseLeave={() => setDropdownOpen(false)}>
                  <div className="dropdown-header">
                    <div className="dropdown-name">{session.user?.user_metadata?.full_name || session.user?.user_metadata?.name || "Guest"}</div>
                    <div className="dropdown-email">{session.user?.email}</div>
                  </div>
                  <div className="dropdown-divider"></div>
                  <Link to="/profile?tab=overview" className="dropdown-item" onClick={() => setDropdownOpen(false)}>
                    <User size={16} /> Profile
                  </Link>
                  <Link to="/profile?tab=continue" className="dropdown-item" onClick={() => setDropdownOpen(false)}>
                    <Play size={16} /> Continue Watching
                  </Link>
                  <Link to="/profile?tab=watchlist" className="dropdown-item" onClick={() => setDropdownOpen(false)}>
                    <Bookmark size={16} /> Watch List
                  </Link>
                  <button
                    className="dropdown-item"
                    onClick={() => {
                      setDropdownOpen(false);
                      setNotifOpen(true);
                    }}
                  >
                    <Bell size={16} /> Notifications
                    {unreadCount > 0 && <span className="dropdown-unread-pill">{unreadCount}</span>}
                  </button>
                  <div className="dropdown-divider"></div>
                  <button className="dropdown-item text-red" onClick={logout}>
                    <LogOut size={16} /> Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link className="login-btn" to="/login">
              <LogIn size={17} /> Sign in
            </Link>
          )}
          <button className="menu-btn" onClick={() => setMenu((v) => !v)}>
            {menu ? <X /> : <Menu />}
          </button>
        </div>
      </header>
      <main>{children}</main>
      <footer>
        <div>
          <b>Anikai</b>
          <span> Stream anime, movies &amp; series in HD with multi-server support.</span>
        </div>
        <small>Metadata powered by TMDB.</small>
      </footer>
    </div>
  );
}

/* ─── Shared UI ──────────────────────────────────────────────────────────── */
function Loader() {
  return (
    <div className="loader">
      <LoaderCircle className="spin" size={34} />
      <span>Loading content...</span>
    </div>
  );
}

function Notice({ text }) {
  return (
    <div className="notice">
      <AlertCircle size={19} />
      {text}
    </div>
  );
}

const FEATURED_ANIME_ITEMS = [
  {
    id: 127532,
    tmdb_id: 127532,
    anilist_id: 151807,
    media_type: "tv",
    title: "Solo Leveling",
    poster_path: "/geCRueV3ElhRTr0xtJuEWJt6dJ1.jpg",
    first_air_date: "2024",
    vote_average: 8.9,
    badge: "SUB / DUB",
  },
  {
    id: 95479,
    tmdb_id: 95479,
    anilist_id: 113415,
    media_type: "tv",
    title: "Jujutsu Kaisen",
    poster_path: "/6qQzMJG27XOJsyAEEIisoJB45j2.jpg",
    first_air_date: "2020",
    vote_average: 9.3,
    badge: "SUB / DUB",
  },
  {
    id: 916224,
    tmdb_id: 916224,
    anilist_id: 142770,
    media_type: "movie",
    title: "Suzume",
    poster_path: "/yStW1TXF5s7Tbtu9KjIZEaWl6HL.jpg",
    release_date: "2022",
    vote_average: 8.5,
    badge: "SUB / DUB",
  },
  {
    id: 114410,
    tmdb_id: 114410,
    anilist_id: 127230,
    media_type: "tv",
    title: "Chainsaw Man",
    poster_path: "/npdB6eFzizki0WaZ1OvKcJrWe97.jpg",
    first_air_date: "2022",
    vote_average: 8.6,
    badge: "SUB / DUB",
  },
  {
    id: 85937,
    tmdb_id: 85937,
    anilist_id: 101922,
    media_type: "tv",
    title: "Demon Slayer: Kimetsu no Yaiba",
    poster_path: "/xUfRZu2mi8jH6SzQEJGP6tjBuYj.jpg",
    first_air_date: "2019",
    vote_average: 8.7,
    badge: "SUB / DUB",
  },
  {
    id: 1429,
    tmdb_id: 1429,
    anilist_id: 16498,
    media_type: "tv",
    title: "Attack on Titan",
    poster_path: "/hTP1DtLGFamjfu8WqjnuQdP1n4i.jpg",
    first_air_date: "2013",
    vote_average: 9.1,
    badge: "SUB / DUB",
  },
];

/* ─── Media card ─────────────────────────────────────────────────────────── */
function MediaCard({ item, customBadge = null }) {
  const type = item.media_type === "anime" ? "tv" : (item.media_type || (item.first_air_date ? "tv" : "movie"));
  const mediaId = item.tmdb_id || item.id || item.anilist_id;
  const title = item.title || item.name || item.title?.english || item.title?.romaji;
  const custom = CUSTOM_MEDIA_DATABASE[String(mediaId)] || CUSTOM_MEDIA_DATABASE[String(item.id)];
  const badgeLabel =
    customBadge || item.badge || (custom ? "SUB/DUB" : "HD");

  const rawPoster = item.poster_path || item.coverImage?.large || item.coverImage?.extraLarge || item.coverImage;
  const posterSrc = rawPoster
    ? (typeof rawPoster === "string" && rawPoster.startsWith("http"))
      ? rawPoster
      : tmdbImage(rawPoster, "w500")
    : fallback;

  return (
    <Link className="media-card" to={`/watch/${type}/${mediaId}`}>
      <div className="poster-wrap">
        <img loading="lazy" src={posterSrc} alt={title} />
        <div className="poster-overlay">
          <Play fill="white" size={24} />
        </div>
        <span className="card-quality-badge">{badgeLabel}</span>
      </div>
      <div className="card-title">{title}</div>
      <div className="card-meta">
        {(item.release_date || item.first_air_date || item.startDate?.year || "").toString().slice(0, 4)}{" "}
        {item.vote_average ? `• ★ ${item.vote_average.toFixed(1)}` : item.averageScore ? `• ★ ${(item.averageScore / 10).toFixed(1)}` : ""}
      </div>
    </Link>
  );
}

/* ─── Section row ───────────────────────────────────────────────────────── */
function Section({ title, items, type = "movie" }) {
  return (
    <section className="section">
      <div className="section-head">
        <h2>{title}</h2>
        <Link to={type === "tv" ? "/tv" : "/movies"}>
          See all <ChevronRight size={17} />
        </Link>
      </div>
      <div className="card-row">
        {items?.slice(0, 10).map((item) => (
          <MediaCard
            key={`${item.media_type || type}-${item.id}`}
            item={item}
          />
        ))}
      </div>
    </section>
  );
}

/* ─── Hero ───────────────────────────────────────────────────────────────── */
function Hero({ item }) {
  const type = item.media_type || (item.first_air_date ? "tv" : "movie");
  return (
    <section
      className="hero"
      style={{
        backgroundImage: `linear-gradient(90deg,#08090d 0%,rgba(8,9,13,.82) 42%,rgba(8,9,13,.15) 100%),linear-gradient(0deg,#08090d 0%,transparent 40%),url(${tmdbImage(
          item.backdrop_path,
          "original"
        )})`,
      }}
    >
      <div className="hero-content">
        <div className="eyebrow flex-gap">
          <Sparkles size={13} /> Featured Stream
        </div>
        <h1>{item.title || item.name}</h1>
        <p>{item.overview || "Discover something great to watch in Full HD."}</p>
        <div className="hero-actions">
          <Link className="primary-btn" to={`/watch/${type}/${item.id}`}>
            <Play fill="currentColor" size={18} /> Stream Now
          </Link>
          <Link className="ghost-btn" to={`/watch/${type}/${item.id}`}>
            Details
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ─── Home ───────────────────────────────────────────────────────────────── */
function Home() {
  const [data, setData] = useState({ trending: [], movies: [], tv: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => { document.title = "Anikai - Watch Anime & Movies"; }, []);
  useEffect(() => {
    Promise.all([getTrending(), getPopularMovies(), getPopularTV()])
      .then(([t, m, tv]) =>
        setData({
          trending: t.results || [],
          movies: m.results || [],
          tv: tv.results || [],
        })
      )
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);
  const hero = data.trending.find((x) => x.backdrop_path) || data.movies[0];
  if (loading) return <Loader />;
  return (
    <>
      {hero && <Hero item={hero} />}
      <div className="container">
        {error && <Notice text={error} />}
        <Section title="Trending This Week" items={data.trending} />
        <Section
          title="Featured Anime & Release Schedule (SUB / DUB)"
          items={FEATURED_ANIME_ITEMS}
          type="tv"
        />
        <Section title="Popular Movies" items={data.movies} />
        <Section title="Popular TV Shows" items={data.tv} type="tv" />
      </div>
    </>
  );
}


/* ─── Listing page ───────────────────────────────────────────────────────── */
function Listing({ type }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    (type === "tv" ? getPopularTV() : getPopularMovies())
      .then((d) => setItems(d.results || []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [type]);
  if (loading) return <Loader />;
  return (
    <div className="container page">
      <div className="page-heading">
        <div>
          <div className="eyebrow">{type === "tv" ? "Series" : "Cinema"}</div>
          <h1>{type === "tv" ? "TV Shows" : "Movies"}</h1>
        </div>
      </div>
      {error && <Notice text={error} />}
      <div className="grid">
        {items.map((i) => (
          <MediaCard key={i.id} item={i} />
        ))}
      </div>
    </div>
  );
}

/* ─── Search ─────────────────────────────────────────────────────────────── */
function SearchPage() {
  const [searchParams] = useSearchParams();
  const q = searchParams.get("q") || "";
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (q) {
      setLoading(true);
      searchMulti(q)
        .then((d) =>
          setItems((d.results || []).filter((x) => x.media_type !== "person"))
        )
        .catch(() => setItems([]))
        .finally(() => setLoading(false));
    } else {
      setItems([]);
      setLoading(false);
    }
  }, [q]);
  if (!q)
    return (
      <div className="container page">
        <h1>Search</h1>
        <p>Type something in the search bar above.</p>
      </div>
    );
  return (
    <div className="container page">
      <div className="eyebrow">Search results</div>
      <h1>Results for &ldquo;{q}&rdquo;</h1>
      {loading ? (
        <Loader />
      ) : (
        <div className="grid">
          {items.map((i) => (
            <MediaCard
              key={`${i.media_type || "movie"}-${i.id}`}
              item={i}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Embed player ───────────────────────────────────────────────────────── */
function EmbedPlayer({ url, reloadKey, isTrailer = false }) {
  const [isIframeLoading, setIsIframeLoading] = useState(true);

  useEffect(() => {
    setIsIframeLoading(true);
  }, [url, reloadKey]);

  return (
    <div className="player-wrapper">
      {isIframeLoading && (
        <div className="player-loading-spinner">
          <LoaderCircle size={38} className="spin" />
          <span>Connecting to stream...</span>
        </div>
      )}
      <iframe
        key={`${url}-${reloadKey}`}
        className={`video ${isIframeLoading ? "loading" : "ready"}`}
        src={url}
        allow="autoplay; fullscreen; picture-in-picture; encrypted-media; accelerometer; gyroscope; clipboard-write; web-share"
        allowFullScreen
        referrerPolicy="origin-when-cross-origin"
        onLoad={() => setIsIframeLoading(false)}
        title={isTrailer ? "Official HD Trailer" : "Video Player"}
      />
    </div>
  );
}

/* ─── Watch page ─────────────────────────────────────────────────────────── */
function WatchPage() {
  const { type, id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [media, setMedia] = useState(null);
  const [error, setError] = useState("");

  // TV state — read initial season/episode from URL
  const [season, setSeason] = useState(() => Number(searchParams.get("season")) || 1);
  const [episode, setEpisode] = useState(() => Number(searchParams.get("episode")) || 1);
  const [seasonData, setSeasonData] = useState(null);

  // Streaming category & server controls
  const preferredAudio = getPreferredAudio();
  const [activeCategoryKey, setActiveCategoryKey] = useState(preferredAudio);
  const [serverIdx, setServerIdx] = useState(0);
  const [activeSubtitleId, setActiveSubtitleId] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [refreshTick, setRefreshTick] = useState(0);
  const [theaterMode, setTheaterMode] = useState(false);
  const [isTrailerActive, setIsTrailerActive] = useState(false);

  // Auto-next & failover state
  const [showAutoNext, setShowAutoNext] = useState(false);
  const [failoverAttempt, setFailoverAttempt] = useState(0);
  const [triedServerIds, setTriedServerIds] = useState(new Set());
  const failoverInProgress = useRef(false);
  const autoplayEnabled = getAutoplayNext();

  // IMPORTANT: useServerHealth must live here — BEFORE any early returns — to satisfy
  // React Hook rules. releaseData is passed in via computed value from `media` state.
  const releaseDataForHook = media
    ? getMediaReleaseData({ type, id, season, episode, imdbId: media.external_ids?.imdb_id || media.imdb_id })
    : null;
  const contentTypeForHook =
    releaseDataForHook?.contentType ||
    CUSTOM_MEDIA_DATABASE[String(id)]?.contentType ||
    (type === "tv" ? "anime" : "movie");
  const { isChecking, getSourceStatus } = useServerHealth(contentTypeForHook, releaseDataForHook ? {
    releaseData: releaseDataForHook,
    type,
    id,
    season,
    episode,
  } : null);

  // Sync URL search params when season/episode change
  useEffect(() => {
    if (type === "tv") {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set("season", String(season));
        next.set("episode", String(episode));
        return next;
      }, { replace: true });
    }
  }, [type, season, episode]);

  // Reset controls when item changes; always re-resolve best audio category
  useEffect(() => {
    setServerIdx(0);
    setActiveSubtitleId(null);
    setIsTrailerActive(false);
    setShowAutoNext(false);
    setTriedServerIds(new Set());
    setFailoverAttempt(0);
    failoverInProgress.current = false;
    // Don't force reset activeCategoryKey here — let the render-time
    // fallback in activeCatConfig handle it so we keep user preference
    // but safely fall back to sub if dub is not available.
  }, [type, id, season, episode]);

  useEffect(() => {
    setMedia(null);
    setError("");
    (type === "tv" ? getTV(id) : getMovie(id))
      .then(setMedia)
      .catch((e) => {
        const custom = CUSTOM_MEDIA_DATABASE[String(id)];
        if (custom) {
          setMedia({
            id: custom.id,
            title: custom.title,
            name: custom.title,
            overview:
              custom.overview ||
              "Stream high-definition episodes with multi-server support and multi-language subtitles.",
            number_of_seasons: custom.seasons
              ? Object.keys(custom.seasons).length
              : 1,
            vote_average: 9.2,
          });
        } else {
          setError(e.message);
        }
      });
  }, [type, id]);

  useEffect(() => {
    setSeason(1);
    setEpisode(1);
  }, [type, id]);

  useEffect(() => {
    if (type === "tv") {
      const custom = CUSTOM_MEDIA_DATABASE[String(id)];
      const customSeasonEps = custom?.seasons?.[season]?.episodes;

      getSeason(id, season)
        .then((res) => {
          if (customSeasonEps && res?.episodes) {
            const merged = res.episodes.map((ep) => {
              const customEp = customSeasonEps.find(
                (ce) => ce.number === ep.episode_number
              );
              return {
                ...ep,
                name: customEp?.title || ep.name,
                overview: customEp?.overview || ep.overview,
              };
            });
            customSeasonEps.forEach((ce) => {
              if (!merged.find((m) => m.episode_number === ce.number)) {
                merged.push({
                  id: `custom-ep-${ce.number}`,
                  episode_number: ce.number,
                  name: ce.title,
                  overview: ce.overview,
                  vote_average: ce.rating || 9.0,
                });
              }
            });
            merged.sort((a, b) => a.episode_number - b.episode_number);
            setSeasonData({ episodes: merged });
          } else {
            setSeasonData(res);
          }
        })
        .catch(() => {
          if (customSeasonEps) {
            setSeasonData({
              episodes: customSeasonEps.map((ce) => ({
                id: `custom-ep-${ce.number}`,
                episode_number: ce.number,
                name: ce.title,
                overview: ce.overview,
                vote_average: ce.rating || 9.0,
              })),
            });
          } else {
            setSeasonData(null);
          }
        });
    }
  }, [type, id, season, media?.number_of_seasons]);
  const pageTitle = media?.title || media?.name;
  // Update browser tab title with Anikai branding
  useEffect(() => {
    if (pageTitle) {
      document.title = `${pageTitle} - Anikai`;
    }
    return () => { document.title = "Anikai - Watch Anime & Movies"; };
  }, [pageTitle]);

  if (error)
    return (
      <div className="container page">
        <Notice text={error} />
      </div>
    );
  if (!media) return <Loader />;

  const imdbId = media.external_ids?.imdb_id || media.imdb_id;
  const trailerUrl = getOfficialTrailerUrl(media.videos);

  // Resolve structured SUB, S-SUB, DUB sources and release schedule
  const releaseData = getMediaReleaseData({
    type,
    id,
    season,
    episode,
    imdbId,
  });

  const subConfig = releaseData?.sub;
  const ssubConfig = releaseData?.ssub;
  const dubConfig = releaseData?.dub;

  // Determine content type (anime vs movie) for server capability filtering.
  // Custom entries are tagged; for generic TMDB content, 'tv' = anime pool, 'movie' = movie pool.
  const contentType =
    releaseData?.contentType ||
    CUSTOM_MEDIA_DATABASE[String(id)]?.contentType ||
    (type === "tv" ? "anime" : "movie");

  // Active category config — resolve safely with fallback to any available category
  let resolvedCategoryKey = activeCategoryKey;
  let activeCatConfig = releaseData?.[resolvedCategoryKey];

  // If the preferred audio category isn't in releaseData, fall back gracefully
  if (!activeCatConfig) {
    if (subConfig) {
      activeCatConfig = subConfig;
      resolvedCategoryKey = "sub";
    } else if (dubConfig) {
      activeCatConfig = dubConfig;
      resolvedCategoryKey = "dub";
    } else if (ssubConfig) {
      activeCatConfig = ssubConfig;
      resolvedCategoryKey = "ssub";
    }
  }

  const activeCategoryStatus = activeCatConfig
    ? getCategoryStatus(activeCatConfig)
    : STATUS_TYPES.AVAILABLE;
  const isCurrentCategoryAvailable =
    activeCategoryStatus === STATUS_TYPES.AVAILABLE;

  const allCategorySources = activeCatConfig?.sources || [];

  // Dynamically rank sources for this exact episode — prioritises:
  //   ① WORKING + English Subtitles ② WORKING + Any Subtitles ③ UNVERIFIED ④ DEGRADED
  // Servers that are UNAVAILABLE or OFFLINE are filtered out automatically.
  const rankedSources = rankSources(
    allCategorySources,
    (src) => getSourceStatus(src, resolvedCategoryKey),
    resolvedCategoryKey
  );
  const currentSources =
    rankedSources.length > 0 ? rankedSources.map((r) => r.source) : allCategorySources;
  const currentServer = currentSources[serverIdx] || currentSources[0] || null;

  // Resolve subtitles from the episode-level health result first, then source metadata
  const currentServerStatus = currentServer
    ? getSourceStatus(currentServer, resolvedCategoryKey)
    : null;
  const subtitles =
    (typeof currentServerStatus === "object" && currentServerStatus?.subtitles?.length > 0
      ? currentServerStatus.subtitles
      : null) ??
    currentServer?.subtitles ??
    activeCatConfig?.subtitles ??
    [];

  // Determine alternative available category if currently chosen category is upcoming/delayed
  let availableAlternative = null;
  if (!isCurrentCategoryAvailable) {
    if (
      resolvedCategoryKey !== "sub" &&
      subConfig &&
      getCategoryStatus(subConfig) === STATUS_TYPES.AVAILABLE
    ) {
      availableAlternative = "SUB";
    } else if (
      resolvedCategoryKey !== "dub" &&
      dubConfig &&
      getCategoryStatus(dubConfig) === STATUS_TYPES.AVAILABLE
    ) {
      availableAlternative = "DUB";
    } else if (
      resolvedCategoryKey !== "ssub" &&
      ssubConfig &&
      getCategoryStatus(ssubConfig) === STATUS_TYPES.AVAILABLE
    ) {
      availableAlternative = "S-SUB";
    }
  }

  const title = media.title || media.name;
  const releaseYear = (
    media.release_date ||
    media.first_air_date ||
    ""
  ).slice(0, 4);
  const runtime = media.runtime
    ? `${Math.floor(media.runtime / 60)}h ${media.runtime % 60}m`
    : media.episode_run_time?.length
    ? `${media.episode_run_time[0]}m/ep`
    : null;
  const genres = media.genres?.map((g) => g.name).join(", ");
  const rating = media.vote_average ? media.vote_average.toFixed(1) : null;
  const cast = media.credits?.cast?.slice(0, 6) || [];
  const recommendations = media.recommendations?.results?.slice(0, 6) || [];

  const totalEpisodesInSeason = seasonData?.episodes?.length || 0;
  const hasPrevEp = type === "tv" && (episode > 1 || season > 1);
  const hasNextEp =
    type === "tv" &&
    (episode < totalEpisodesInSeason || season < (media.number_of_seasons || 1));

  function handlePrevEpisode() {
    if (episode > 1) {
      setEpisode(episode - 1);
    } else if (season > 1) {
      setSeason(season - 1);
      setEpisode(1);
    }
  }

  function handleNextEpisode() {
    if (episode < totalEpisodesInSeason) {
      setEpisode(episode + 1);
    } else if (season < (media.number_of_seasons || 1)) {
      setSeason(season + 1);
      setEpisode(1);
    }
  }

  function handleReloadStream() {
    setTriedServerIds(new Set());
    setFailoverAttempt(0);
    failoverInProgress.current = false;
    setReloadKey((prev) => prev + 1);
  }

  function handleCountdownExpire() {
    // Automatically re-evaluate release status without requiring page refresh
    setRefreshTick((prev) => prev + 1);
  }

  // Auto-failover: called by EnhancedEmbedPlayer when a server fails to load
  function handleFailover(failedServerId) {
    if (failoverInProgress.current) return;
    failoverInProgress.current = true;

    if (failedServerId) {
      recordServerFailure(failedServerId);
      setTriedServerIds((prev) => new Set([...prev, failedServerId]));
      // Mark this exact episode+server as UNAVAILABLE in the health service
      // so it is skipped in future rankings for this session
      try {
        reportRuntimePlaybackIssue({
          serverId: failedServerId,
          type,
          id,
          season,
          episode,
          categoryKey: resolvedCategoryKey,
          issueType: "unavailable",
        });
      } catch (_) {}
    }

    // Find next untried source from ranked list
    const nextIndex = currentSources.findIndex(
      (src, idx) => idx > serverIdx && !triedServerIds.has(src.id)
    );
    if (nextIndex !== -1) {
      setServerIdx(nextIndex);
    } else {
      // All sources failed
      setServerIdx(-1); // signals error to player
    }
    setTimeout(() => {
      failoverInProgress.current = false;
    }, 1500);
  }

  function handleManualSelectServer(catKey, index, srv) {
    const rawKey = String(catKey || "sub").toLowerCase().replace("-", "");
    const safeKey = rawKey === "ssub" ? "ssub" : (rawKey === "dub" ? "dub" : "sub");
    setActiveCategoryKey(safeKey);
    setServerIdx(index);
    setIsTrailerActive(false);
    setTriedServerIds(new Set());
    setFailoverAttempt(0);
    failoverInProgress.current = false;
    if (srv?.id) {
      setPreferredServer(srv.id);
    }
    // Immediately reload video iframe src with chosen server and audio track without full page reload
    setReloadKey((prev) => prev + 1);
  }

  function handleSelectCategory(catKey) {
    const rawKey = String(catKey || "sub").toLowerCase().replace("-", "");
    const safeKey = rawKey === "ssub" ? "ssub" : (rawKey === "dub" ? "dub" : "sub");
    setActiveCategoryKey(safeKey);
    setServerIdx(0);
    setIsTrailerActive(false);
    setTriedServerIds(new Set());
    setFailoverAttempt(0);
    failoverInProgress.current = false;
    setPreferredAudio(safeKey);
    // Immediately reload video iframe src with newly selected audio track without full page reload
    setReloadKey((prev) => prev + 1);
  }

  return (
    <div className={`watch-page-wrapper ${theaterMode ? "theater-active" : ""}`}>
      <div
        className={`container page watch-page ${
          theaterMode ? "theater-container" : ""
        }`}
      >
        {/* ── Compact Player Controls Header ── */}
        <div className="player-top-bar">
          <div className="player-meta-left">
            {/* ── Dedicated SUB / DUB Audio Toggle Buttons ── */}
            <div className="player-audio-toggle-group" style={{ display: "inline-flex", gap: "6px", alignItems: "center" }}>
              <button
                type="button"
                className={`player-tool-btn player-audio-btn ${resolvedCategoryKey === "sub" ? "active" : ""}`}
                onClick={() => handleSelectCategory("sub")}
                title="Switch to Japanese Audio with English Subtitles (SUB)"
                style={{ padding: "4px 10px", fontSize: "11px", fontWeight: 700 }}
              >
                SUB
              </button>
              <button
                type="button"
                className={`player-tool-btn player-audio-btn ${resolvedCategoryKey === "dub" ? "active" : ""}`}
                onClick={() => handleSelectCategory("dub")}
                title="Switch to English Dubbed Audio (DUB)"
                style={{ padding: "4px 10px", fontSize: "11px", fontWeight: 700 }}
              >
                DUB
              </button>
              {ssubConfig && (
                <button
                  type="button"
                  className={`player-tool-btn player-audio-btn ${resolvedCategoryKey === "ssub" ? "active" : ""}`}
                  onClick={() => handleSelectCategory("ssub")}
                  title="Switch to Soft-Subtitles (S-SUB)"
                  style={{ padding: "4px 10px", fontSize: "11px", fontWeight: 700 }}
                >
                  S-SUB
                </button>
              )}
            </div>

            <ReleaseStatusBadge
              status={activeCategoryStatus}
              targetDate={activeCatConfig?.releaseAt}
              size="sm"
            />
            {isCurrentCategoryAvailable && currentServer?.badge && (
              <span
                className={`quality-badge-pill ${
                  currentServer.badgeClass || "badge-fhd"
                }`}
              >
                {isTrailerActive ? "Trailer" : currentServer.badge}
              </span>
            )}
            {isCurrentCategoryAvailable && !isTrailerActive && (
              <span className="player-shield-indicator" title="Ad Shield Active - Popups & Redirects Blocked">
                <ShieldCheck size={12} />
                <span>Ad Shield</span>
              </span>
            )}
            <span className="player-server-name">
              {isTrailerActive
                ? "Official Trailer"
                : isCurrentCategoryAvailable
                ? (currentServer?.name || `Server ${serverIdx + 1}`)
                : `${resolvedCategoryKey.toUpperCase()} Release Scheduled`}
            </span>
          </div>

          <div className="player-actions-right">
            {trailerUrl && (
              <button
                className={`player-tool-btn ${isTrailerActive ? "active" : ""}`}
                onClick={() => setIsTrailerActive((v) => !v)}
                title="Watch Official HD Trailer"
              >
                <Clapperboard size={14} />
                <span>{isTrailerActive ? "Stream" : "Trailer"}</span>
              </button>
            )}

            <button
              className="player-tool-btn"
              onClick={handleReloadStream}
              title="Reload video stream"
            >
              <RotateCcw size={14} />
              <span>Reload</span>
            </button>

            <button
              className={`player-tool-btn ${theaterMode ? "active" : ""}`}
              onClick={() => setTheaterMode((v) => !v)}
              title={theaterMode ? "Exit Theater Mode" : "Theater Mode"}
            >
              {theaterMode ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              <span>Theater</span>
            </button>
          </div>
        </div>

        {/* ── Player Frame ── */}
        <div className="player-shell">
          {isChecking && !isTrailerActive ? (
            <div className="player-all-failed-overlay">
              <LoaderCircle size={38} className="spin" style={{ marginBottom: "1rem" }} />
              <h3>Finding Best Stream...</h3>
              <p>Validating servers &amp; checking subtitles for this episode.</p>
            </div>
          ) : isTrailerActive && trailerUrl ? (
            <EnhancedEmbedPlayer
              server={{ url: trailerUrl }}
              serverName="Official HD Trailer"
              serverIndex={0}
              totalServers={1}
              reloadKey={reloadKey}
              isTrailer={true}
              trailerUrl={trailerUrl}
              mediaType={type}
              mediaId={id}
              mediaTitle={title}
              season={season}
              episode={episode}
              posterPath={media?.poster_path}
              onManualReload={handleReloadStream}
            />
          ) : isCurrentCategoryAvailable && currentServer?.url && serverIdx >= 0 ? (
            <EnhancedEmbedPlayer
              server={currentServer}
              serverName={currentServer.name || `Server ${serverIdx + 1}`}
              serverIndex={serverIdx}
              totalServers={currentSources.length}
              reloadKey={reloadKey}
              isTrailer={false}
              skipTimings={currentServer?.skipTimings || activeCatConfig?.skipTimings || null}
              mediaType={type}
              mediaId={id}
              mediaTitle={title || ""}
              season={season}
              episode={episode}
              posterPath={media?.poster_path}
              hasNextEpisode={hasNextEp}
              nextEpisodeNumber={episode + 1}
              nextEpisodeTitle={seasonData?.episodes?.find(ep => ep.episode_number === episode + 1)?.name || ""}
              onPlayNextEpisode={() => {
                setShowAutoNext(false);
                handleNextEpisode();
              }}
              onFailover={handleFailover}
              onManualReload={handleReloadStream}
            />
          ) : serverIdx < 0 ? (
            // All servers failed
            <div className="player-all-failed-overlay">
              <div className="player-error-card">
                <WifiOff size={36} />
                <h3>No Working Servers Available</h3>
                <p>All configured sources are currently unavailable for this title.</p>
                <button type="button" className="primary-btn" onClick={handleReloadStream}>
                  <RotateCcw size={14} /> Try Again
                </button>
              </div>
            </div>
          ) : (
            <UpcomingOverlay
              mediaTitle={
                type === "tv" ? `${title} S${season}E${episode}` : title
              }
              category={resolvedCategoryKey.toUpperCase()}
              categoryConfig={activeCatConfig}
              availableAlternativeCategory={availableAlternative}
              onSwitchCategory={(cat) => {
                const normalized = cat.toLowerCase().replace("-", "");
                handleSelectCategory(normalized === "ssub" ? "ssub" : normalized);
              }}
              onExpire={handleCountdownExpire}
            />
          )}
        </div>

        {/* ── Auto-Next Episode Overlay ── */}
        {showAutoNext && hasNextEp && (
          <AutoNextOverlay
            nextEpisodeNumber={episode + 1}
            nextEpisodeTitle={seasonData?.episodes?.find(ep => ep.episode_number === episode + 1)?.name || ""}
            onPlayNext={() => {
              setShowAutoNext(false);
              handleNextEpisode();
            }}
            onCancel={() => setShowAutoNext(false)}
          />
        )}

        {/* ── TV Episode Prev/Next Bar ── */}
        {type === "tv" && (
          <div className="episode-nav-bar">
            <button
              className="ep-nav-btn"
              onClick={handlePrevEpisode}
              disabled={!hasPrevEp}
            >
              <ChevronLeft size={15} /> Prev Ep
            </button>
            <div className="ep-nav-indicator">
              Season {season} · Episode {episode}
            </div>
            <button
              className="ep-nav-btn"
              onClick={handleNextEpisode}
              disabled={!hasNextEp}
            >
              Next Ep <ChevronRight size={15} />
            </button>
          </div>
        )}

        {/* ── Subtitle Selector (when subtitles exist for current stream) ── */}
        {isCurrentCategoryAvailable && subtitles.length > 0 && (
          <SubtitleSelector
            subtitles={subtitles}
            activeSubtitleId={activeSubtitleId}
            onSelectSubtitle={(subId) => setActiveSubtitleId(subId)}
          />
        )}

        {/* ── Sleek Categorized Streaming Sources (SUB, S-SUB, DUB) ── */}
        <StreamingSources
          sourcesConfig={releaseData}
          contentType={contentType}
          mediaContext={{ type, id, season, episode }}
          activeCategoryKey={resolvedCategoryKey}
          activeServerIndex={serverIdx}
          onSelectCategory={handleSelectCategory}
          onSelectServer={handleManualSelectServer}
          onReloadStream={handleReloadStream}
        />

        {/* ── Clean Media Metadata ── */}
        <div className="watch-info-section">
          <div className="watch-title-row">
            <h1 className="watch-main-title">{title}</h1>
            <div className="watch-meta-pills">
              {releaseYear && <span className="meta-pill">{releaseYear}</span>}
              {runtime && <span className="meta-pill">{runtime}</span>}
              {rating && (
                <span className="meta-pill rating-pill">
                  <Star size={13} fill="#fbbf24" color="#fbbf24" /> {rating}
                </span>
              )}
              <span className="meta-pill quality-pill">HD / 2K QHD</span>
            </div>
          </div>
          {genres && <div className="genre-text">{genres}</div>}
          <p className="media-synopsis">
            {media.overview || "No overview available."}
          </p>

          {/* ── Watchlist Tracker (add to list / rate / track episodes) ── */}
          <div style={{ marginTop: 16 }}>
            <MediaWatchlistTracker
              media={{
                ...media,
                tmdb_id: media.id,
                media_type: type,
                isAnime: contentType === "anime",
              }}
              mediaType={contentType === "anime" ? "anime" : type}
              totalEpisodes={media.number_of_episodes || media.episodes || null}
            />
          </div>
        </div>

        {/* ── Legal Streaming Options (TMDB JustWatch) — movies & TV only ── */}
        {(type === "movie" || (type === "tv" && contentType !== "anime")) && (
          <LegalWatchProviders
            mediaType={type}
            mediaId={media.id}
            mediaTitle={title}
          />
        )}

        {/* ── TV Episodes List with Real-Time Availability ── */}
        {type === "tv" && (
          <div className="episodes">
            <div className="episode-top">
              <b>
                Episodes (
                {totalEpisodesInSeason || seasonData?.episodes?.length || 0})
              </b>
              {media.number_of_seasons > 1 && (
                <select
                  value={season}
                  onChange={(e) => {
                    setSeason(+e.target.value);
                    setEpisode(1);
                  }}
                  className="season-select"
                >
                  {Array.from(
                    { length: media.number_of_seasons },
                    (_, i) => (
                      <option key={i + 1} value={i + 1}>
                        Season {i + 1}
                      </option>
                    )
                  )}
                </select>
              )}
            </div>

            <div className="episode-grid">
              {(seasonData?.episodes || []).map((ep) => {
                const isCurrent = episode === ep.episode_number;
                const epReleaseData = getMediaReleaseData({
                  type: "tv",
                  id,
                  season,
                  episode: ep.episode_number,
                });

                return (
                  <EpisodeAvailability
                    key={ep.id || ep.episode_number}
                    episodeNumber={ep.episode_number}
                    title={ep.name}
                    overview={ep.overview}
                    rating={ep.vote_average}
                    episodeConfig={epReleaseData}
                    isCurrent={isCurrent}
                    watchProgress={getWatchProgress("tv", id, season, ep.episode_number)}
                    onSelect={() => {
                      setEpisode(ep.episode_number);
                      setServerIdx(0);
                      setIsTrailerActive(false);
                      setTriedServerIds(new Set());
                      setFailoverAttempt(0);
                      failoverInProgress.current = false;
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* ── Cast ── */}
        {cast.length > 0 && (
          <div className="cast-section">
            <b>Featured Cast</b>
            <div className="cast-row">
              {cast.map((c) => (
                <div key={c.id} className="cast-card">
                  <img
                    src={tmdbImage(c.profile_path, "w185") || fallback}
                    alt={c.name}
                    className="cast-avatar"
                  />
                  <div className="cast-info">
                    <div className="cast-name">{c.name}</div>
                    <div className="cast-char">{c.character}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Recommendations ── */}
        {recommendations.length > 0 && (
          <div className="section recommendations-section">
            <div className="section-head">
              <h2>You May Also Like</h2>
            </div>
            <div className="card-row">
              {recommendations.map((item) => (
                <MediaCard
                  key={`${item.media_type || type}-${item.id}`}
                  item={item}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


/* ─── Auth Callback ──────────────────────────────────────────────────────── */
function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState("");

  useEffect(() => {
    if (!supabase) {
      setError("Supabase is not configured.");
      return;
    }

    // Supabase automatically picks up the tokens from the URL hash/query
    // when we call getSession or when onAuthStateChange fires.
    // We just need to wait for the session to be established and then redirect.
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        // Small delay to ensure session is fully persisted
        setTimeout(() => navigate("/", { replace: true }), 150);
      }
    });

    // Also check if session is already established (e.g. from the hash)
    supabase.auth.getSession().then(({ data: { session }, error: err }) => {
      if (err) {
        setError(err.message);
      } else if (session) {
        navigate("/", { replace: true });
      }
    });

    // Safety timeout — if nothing happens within 10s, show an error
    const timeout = setTimeout(() => {
      setError("Authentication timed out. Please try signing in again.");
    }, 10000);

    return () => {
      listener.subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [navigate]);

  if (error) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="brand big">
            <span className="brand-mark">A</span> Ani<span>kai</span>
          </div>
          <h1>Sign-in failed</h1>
          <Notice text={error} />
          <Link className="primary-btn" to="/login" style={{ marginTop: 16, display: "inline-flex" }}>
            Try again
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ textAlign: "center" }}>
        <LoaderCircle className="spin" size={36} style={{ margin: "0 auto 16px" }} />
        <h1 style={{ fontSize: 22 }}>Signing you in...</h1>
        <p>Completing authentication with Google.</p>
      </div>
    </div>
  );
}

/* ─── Login ──────────────────────────────────────────────────────────────── */
function Login() {
  const session = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState("");

  useEffect(() => {
    if (session) navigate("/", { replace: true });
  }, [session, navigate]);

  async function oauth(provider) {
    setBusy(provider);
    try {
      await signInWithProvider(provider);
    } catch (e) {
      alert(e.message);
    } finally {
      setBusy("");
    }
  }
  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="brand big">
          <span className="brand-mark">A</span> Ani<span>kai</span>
        </div>
        <h1>Welcome back</h1>
        <p>Sign in to keep your list and watch history.</p>
        {!authConfigured && (
          <Notice text="Supabase is not configured yet. Add the APP_SUPABASE_* variables to enable authentication." />
        )}
        <button
          className="oauth google"
          disabled={!authConfigured || busy}
          onClick={() => oauth("google")}
        >
          {busy === "google" ? <LoaderCircle className="spin" /> : <span>G</span>}{" "}
          Continue with Google
        </button>
        <button
          className="oauth discord"
          disabled={!authConfigured || busy}
          onClick={() => oauth("discord")}
        >
          Continue with Discord
        </button>
        <button
          className="oauth facebook"
          disabled={!authConfigured || busy}
          onClick={() => oauth("facebook")}
        >
          Continue with Facebook
        </button>
        <div className="divider">or</div>
        <p className="small">
          Email/password authentication can be enabled with Supabase Auth.
        </p>
      </div>
    </div>
  );
}

/* ─── Profile ────────────────────────────────────────────────────────────── */
function Profile() {
  const session = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") || "continue";
  const [activeTab, setActiveTab] = useState(initialTab);
  
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && ["overview", "continue", "history", "watchlist", "favorites"].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };
  
  const avatarUrl = session?.user?.user_metadata?.avatar_url;
  const fullName = session?.user?.user_metadata?.full_name || session?.user?.user_metadata?.name;
  const email = session?.user?.email;
  
  const memberSince = session?.user?.created_at 
    ? new Date(session.user.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) 
    : "Recently";

  useEffect(() => {
    if (!session && supabase) {
      const timer = setTimeout(() => {
        if (!session) navigate("/login", { replace: true });
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [session, navigate]);

  async function logout() {
    if (supabase) {
      await supabase.auth.signOut();
      navigate("/", { replace: true });
    }
  }

  const allProgress = Object.values(getAllWatchProgress()).sort((a, b) => b.updatedAt - a.updatedAt);

  if (!session) {
    return <div className="container page"><LoaderCircle className="spin" size={32} style={{margin: "auto", display: "block", marginTop: "10vh", color: "#8b8d9c"}}/></div>;
  }

  return (
    <div className="profile-page-modern">
      {/* Banner & Header */}
      <div className="profile-banner">
        <div className="profile-banner-overlay"></div>
      </div>
      
      <div className="container profile-header-container">
        <div className="profile-header-info">
          <div className="profile-avatar-large">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" />
            ) : (
              <User size={50} />
            )}
          </div>
          <div className="profile-text-details">
            <h1>{fullName || email || "Guest"}</h1>
            <p className="profile-email">{email}</p>
            <p className="profile-joined">Member since {memberSince}</p>
          </div>
        </div>
        
        <div className="profile-actions">
          <button className="ghost-btn edit-profile-btn" onClick={() => alert("Edit profile feature coming soon!")}>
            Edit Profile
          </button>
          <button className="primary-btn logout-btn" onClick={logout}>
            Sign out
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="container profile-tabs-container">
        <div className="profile-tabs">
          {["overview", "continue", "history", "watchlist", "favorites"].map(tab => (
            <button 
              key={tab} 
              className={`profile-tab ${activeTab === tab ? "active" : ""}`}
              onClick={() => handleTabChange(tab)}
            >
              {tab === "continue" ? "Continue Watching" : 
               tab === "history" ? "Watch History" : 
               tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="container profile-content">
        {activeTab === "continue" && (
          <div className="profile-continue-section">
            {allProgress.length > 0 ? (
              <div className="continue-grid">
                {allProgress.map(prog => {
                  const isTV = prog.type === 'tv' || prog.type === 'anime';
                  const posterImg = prog.posterPath 
                    ? (prog.posterPath.startsWith("http") ? prog.posterPath : `https://image.tmdb.org/t/p/w500${prog.posterPath}`) 
                    : "https://placehold.co/600x900/101217/ffffff?text=No+Poster";
                  
                  return (
                    <div key={prog.key} className="continue-card">
                      <div className="continue-poster">
                        <img loading="lazy" src={posterImg} alt={prog.title} />
                        <div className="continue-overlay">
                          <Link to={`/watch/${prog.type}/${prog.id}?s=${prog.season}&e=${prog.episode}`} className="play-circle">
                            <Play fill="white" size={24} />
                          </Link>
                        </div>
                        <div className="continue-progress-bar">
                          <div className="continue-progress-fill" style={{ width: `${prog.progressPercent}%` }}></div>
                        </div>
                      </div>
                      <div className="continue-info">
                        <h3>{prog.title}</h3>
                        <p className="continue-meta">
                          {isTV ? `S${prog.season} • E${prog.episode}` : "Movie"}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state">
                <Clock size={32} />
                <h3>No Watch History</h3>
                <p>Start watching some movies or shows and they will appear here.</p>
                <Link to="/" className="primary-btn" style={{marginTop: 16, display: "inline-flex"}}>Explore Content</Link>
              </div>
            )}
          </div>
        )}

        {/* ── Watchlist Dashboard (Polymorphic — movies, TV, anime) ── */}
        {activeTab === "watchlist" && (
          <WatchlistDashboard
            onSelectMedia={(item) => {
              const routeType = item.media_type === "anime" ? "tv" : (item.media_type || "movie");
              const mediaId = item.tmdb_id || item.anilist_id || item.media_id;
              navigate(`/watch/${routeType}/${mediaId}`);
            }}
          />
        )}

        {/* Other tabs placeholders */}
        {activeTab !== "continue" && activeTab !== "watchlist" && (
          <div className="empty-state">
            <Layers size={32} />
            <h3>{activeTab === "history" ? "Watch History" : activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</h3>
            <p>This feature will be available once your Supabase database tables are fully configured.</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Error Boundary ──────────────────────────────────────────────────────── */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="container page"
          style={{
            minHeight: "60vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div className="player-error-card" style={{ maxWidth: "450px" }}>
            <div className="error-icon-wrap">
              <AlertCircle size={36} />
            </div>
            <h2 className="error-heading">Unable to Load Page</h2>
            <p className="error-desc">
              {this.state.error?.message ||
                "An unexpected rendering issue occurred. Please return home or try again."}
            </p>
            <div className="error-actions" style={{ marginTop: "14px" }}>
              <button
                type="button"
                className="primary-btn"
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.href = "/";
                }}
              >
                <RotateCcw size={14} /> Go to Home
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ─── Notifications ──────────────────────────────────────────────────────── */
function Notifications() {
  const {
    notifications,
    readIds,
    unreadCount,
    markAsRead,
    markAllRead,
  } = useNotifications();

  return (
    <div className="container page notif-center-page">
      <div className="notif-page-heading-box">
        <div className="notif-heading-text">
          <h1>Release Notifications</h1>
          <p>
            Discover newly released anime episodes, movie premieres, and upcoming broadcast countdowns.
          </p>
        </div>
      </div>

      <NotificationPanel
        notifications={notifications}
        readIds={readIds}
        unreadCount={unreadCount}
        onMarkAsRead={markAsRead}
        onMarkAllRead={markAllRead}
        isDropdown={false}
      />
    </div>
  );
}

/* ─── App ────────────────────────────────────────────────────────────────── */
export default function App() {
  return (
    <ErrorBoundary>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/movies" element={<Listing type="movie" />} />
          <Route path="/tv" element={<Listing type="tv" />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/watch/:type/:id" element={<WatchPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route
            path="*"
            element={
              <div className="container page">
                <h1>404</h1>
                <p>Page not found.</p>
                <Link className="primary-btn" to="/">
                  Go home
                </Link>
              </div>
            }
          />
        </Routes>
      </Layout>
    </ErrorBoundary>
  );
}