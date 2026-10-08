/**
 * ServerPlayer.jsx
 *
 * AniWave-style streaming player with dynamic server switcher.
 * - Fetches servers from local Express backend (http://localhost:3000)
 * - Embed URLs  → strict sandbox iframe
 * - HLS .m3u8  → HLS.js piped into Plyr native <video>
 * - Dark AniWave UI via CSS custom properties
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import Plyr from "plyr";
import Hls from "hls.js";
import "plyr/dist/plyr.css";

const BACKEND_URL = "http://localhost:3000";
const EMBED_PROVIDERS = new Set(["vidplay", "filemoon", "mycloud", "mp4upload"]);

function isHlsUrl(url = "") {
  return url.includes(".m3u8") || url.includes("manifest/hls");
}

function providerBadgeClass(name = "") {
  const l = (name || "").toLowerCase();
  if (l.includes("vidplay"))   return "sp-badge--vidplay";
  if (l.includes("filemoon"))  return "sp-badge--filemoon";
  if (l.includes("mycloud"))   return "sp-badge--mycloud";
  if (l.includes("mp4"))       return "sp-badge--mp4";
  return "sp-badge--default";
}

export default function ServerPlayer({
  animeId,
  season     = 1,
  episodeNum = 1,
  title      = "",
  posterUrl  = "",
}) {
  const [servers, setServers]       = useState([]);
  const [active, setActive]         = useState(null);
  const [loading, setLoading]       = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [playerMode, setPlayerMode] = useState("idle");

  const videoRef = useRef(null);
  const plyrRef  = useRef(null);
  const hlsRef   = useRef(null);

  // ── fetch servers ─────────────────────────────────────────────────────
  const fetchSources = useCallback(() => {
    if (!animeId) return;
    setLoading(true);
    setFetchError("");
    setServers([]);
    setActive(null);
    setPlayerMode("idle");

    fetch(`${BACKEND_URL}/sources/${animeId}/${season}/${episodeNum}`)
      .then((r) => {
        if (!r.ok) throw new Error(`Backend error ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (!Array.isArray(data) || data.length === 0)
          throw new Error("No sources returned for this episode");
        setServers(data);
        setActive(data[0]);
      })
      .catch((e) => setFetchError(e.message))
      .finally(() => setLoading(false));
  }, [animeId, season, episodeNum]);

  useEffect(() => { fetchSources(); }, [fetchSources]);

  // ── choose render mode ────────────────────────────────────────────────
  useEffect(() => {
    if (!active?.url) { setPlayerMode("idle"); return; }
    const embed =
      EMBED_PROVIDERS.has((active.provider || "").toLowerCase()) ||
      !isHlsUrl(active.url);
    setPlayerMode(embed ? "iframe" : "hls");
  }, [active]);

  // ── HLS.js + Plyr setup ───────────────────────────────────────────────
  useEffect(() => {
    if (playerMode !== "hls" || !videoRef.current || !active?.url) return;

    if (hlsRef.current)  { hlsRef.current.destroy();  hlsRef.current  = null; }
    if (plyrRef.current) { plyrRef.current.destroy();  plyrRef.current = null; }

    const video = videoRef.current;

    const CONTROLS = [
      "play-large","rewind","play","fast-forward",
      "progress","current-time","duration",
      "mute","volume","captions","settings","pip","fullscreen",
    ];

    function initPlyr() {
      plyrRef.current = new Plyr(video, {
        controls: CONTROLS,
        settings: ["quality", "speed"],
        tooltips: { controls: true, seek: true },
        keyboard: { focused: true, global: false },
        autopause: false,
        poster: posterUrl || undefined,
      });
    }

    if (Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true, backBufferLength: 90 });
      hls.loadSource(active.url);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        initPlyr();
        video.play().catch(() => {});
      });
      hls.on(Hls.Events.ERROR, (_, data) => { if (data.fatal) hls.destroy(); });
      hlsRef.current = hls;
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = active.url;
      initPlyr();
      video.play().catch(() => {});
    } else {
      setFetchError("Your browser does not support HLS playback.");
    }

    return () => {
      if (hlsRef.current)  { hlsRef.current.destroy();  hlsRef.current  = null; }
      if (plyrRef.current) { plyrRef.current.destroy();  plyrRef.current = null; }
    };
  }, [playerMode, active, posterUrl]);

  const handleSelectServer = useCallback((srv) => setActive(srv), []);

  // ─── render ───────────────────────────────────────────────────────────
  return (
    <div className="sp-root" style={CSS_VARS}>
      {/* Header */}
      {title && (
        <div className="sp-header">
          <span className="sp-header__title">{title}</span>
          {active && (
            <span className={`sp-header__badge ${providerBadgeClass(active.provider)}`}>
              {(active.provider || "stream").toUpperCase()}
            </span>
          )}
        </div>
      )}

      {/* Player shell – 16:9 aspect via padding-top */}
      <div className="sp-player-shell">

        {loading && (
          <div className="sp-overlay sp-overlay--loading">
            <svg className="sp-spinner" viewBox="0 0 50 50">
              <circle cx="25" cy="25" r="20" fill="none" strokeWidth="4" />
            </svg>
            <span>Fetching servers…</span>
          </div>
        )}

        {!loading && fetchError && (
          <div className="sp-overlay sp-overlay--error">
            <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <p>{fetchError}</p>
            <button className="sp-retry-btn" onClick={fetchSources}>Retry</button>
          </div>
        )}

        {!loading && !fetchError && playerMode === "idle" && (
          <div className="sp-overlay sp-overlay--idle">
            {posterUrl
              ? <img src={posterUrl} alt={title} className="sp-poster" />
              : (
                <svg viewBox="0 0 24 24" width="52" height="52" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <polygon points="5,3 19,12 5,21" />
                </svg>
              )}
            <span>Select a server below to start streaming</span>
          </div>
        )}

        {/* Embed iframe */}
        {playerMode === "iframe" && active?.url && (
          <iframe
            key={`${active.provider}-${active.url}`}
            className="sp-iframe"
            src={active.url}
            title={`${active.name || active.provider} player`}
            allowFullScreen
            allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
            sandbox="allow-scripts allow-same-origin"
            referrerPolicy="origin-when-cross-origin"
          />
        )}

        {/* HLS native video – always mounted, hidden when not in use */}
        <video
          ref={videoRef}
          className="sp-video"
          style={{ display: playerMode === "hls" ? "block" : "none" }}
          playsInline
          crossOrigin="anonymous"
          poster={posterUrl || undefined}
        />
      </div>

      {/* Server switcher row */}
      {servers.length > 0 && (
        <div className="sp-server-bar">
          <span className="sp-server-bar__label">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5">
              <rect x="2" y="3"  width="20" height="4" rx="1" />
              <rect x="2" y="10" width="20" height="4" rx="1" />
              <rect x="2" y="17" width="20" height="4" rx="1" />
            </svg>
            Servers
          </span>

          <div className="sp-server-list" role="group" aria-label="Server selection">
            {servers.map((srv, idx) => {
              const isActive = active?.url === srv.url;
              const isHls    = isHlsUrl(srv.url);
              return (
                <button
                  key={`${srv.provider}-${idx}`}
                  type="button"
                  className={`sp-server-btn${isActive ? " sp-server-btn--active" : ""}`}
                  onClick={() => handleSelectServer(srv)}
                  aria-pressed={isActive}
                  title={isHls ? "Native HLS stream" : "Embed player"}
                >
                  <span className={`sp-server-dot ${providerBadgeClass(srv.provider)}`} />
                  <span className="sp-server-name">
                    {srv.name || srv.provider || `Server ${idx + 1}`}
                  </span>
                  {isHls && <span className="sp-server-tag">HLS</span>}
                  {isActive && (
                    <svg viewBox="0 0 12 12" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" style={{flexShrink:0,color:"var(--sp-accent)"}}>
                      <polyline points="1.5,6 4.5,9 10.5,3" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <style>{SP_STYLES}</style>
    </div>
  );
}

// ── CSS custom properties ────────────────────────────────────────────────────
const CSS_VARS = {
  "--sp-bg":          "#0d0f14",
  "--sp-surface":     "#151820",
  "--sp-surface-2":   "#1c2030",
  "--sp-border":      "rgba(255,255,255,0.07)",
  "--sp-accent":      "#6c63ff",
  "--sp-accent-glow": "rgba(108,99,255,0.25)",
  "--sp-text":        "#e2e8f0",
  "--sp-text-muted":  "#8892a4",
  "--sp-error":       "#f87171",
  "--sp-vidplay":     "#00d4aa",
  "--sp-filemoon":    "#f59e0b",
  "--sp-mycloud":     "#38bdf8",
  "--sp-mp4":         "#a78bfa",
  "--sp-radius":      "12px",
  "--sp-radius-sm":   "6px",
  "--sp-aspect":      "56.25%",
};

// ── Scoped styles ────────────────────────────────────────────────────────────
const SP_STYLES = `
.sp-root {
  font-family: 'Inter','Segoe UI',system-ui,sans-serif;
  background: var(--sp-bg);
  border-radius: var(--sp-radius);
  overflow: hidden;
  border: 1px solid var(--sp-border);
  display: flex;
  flex-direction: column;
  width: 100%;
  color: var(--sp-text);
}

/* Header */
.sp-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 16px;
  background: var(--sp-surface);
  border-bottom: 1px solid var(--sp-border);
  gap: 10px; min-height: 42px;
}
.sp-header__title {
  font-size: 14px; font-weight: 600;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.sp-header__badge {
  font-size: 10px; font-weight: 700; letter-spacing: .06em;
  padding: 3px 9px; border-radius: 99px;
  background: var(--sp-surface-2); color: var(--sp-text-muted);
  flex-shrink: 0; border: 1px solid var(--sp-border);
}
.sp-header__badge.sp-badge--vidplay  { border-color:var(--sp-vidplay);  color:var(--sp-vidplay); }
.sp-header__badge.sp-badge--filemoon { border-color:var(--sp-filemoon); color:var(--sp-filemoon); }
.sp-header__badge.sp-badge--mycloud  { border-color:var(--sp-mycloud);  color:var(--sp-mycloud); }
.sp-header__badge.sp-badge--mp4      { border-color:var(--sp-mp4);      color:var(--sp-mp4); }

/* 16:9 shell */
.sp-player-shell {
  position: relative; width: 100%;
  padding-top: var(--sp-aspect); background: #000;
}
.sp-player-shell > * {
  position: absolute; inset: 0; width: 100%; height: 100%;
}

/* Overlays */
.sp-overlay {
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; gap: 14px;
  background: var(--sp-surface); color: var(--sp-text-muted);
  font-size: 13px; z-index: 10;
}
.sp-overlay p { margin: 0; text-align: center; max-width: 280px; line-height: 1.5; }
.sp-overlay--error { color: var(--sp-error); }
.sp-spinner {
  width: 44px; height: 44px;
  animation: sp-spin 0.9s linear infinite;
  stroke: var(--sp-accent);
}
@keyframes sp-spin { to { transform: rotate(360deg); } }
.sp-poster {
  width: auto; max-height: 60%; max-width: 30%;
  object-fit: contain; border-radius: 8px; opacity: .5;
}
.sp-retry-btn {
  margin-top: 4px; padding: 7px 22px;
  border-radius: var(--sp-radius-sm);
  background: var(--sp-surface-2); border: 1px solid var(--sp-border);
  color: var(--sp-text); font-size: 13px; cursor: pointer;
  transition: background .2s, border-color .2s;
}
.sp-retry-btn:hover { background: var(--sp-accent-glow); border-color: var(--sp-accent); }

/* Iframe */
.sp-iframe { border: none; display: block; }

/* HLS video */
.sp-video { background: #000; display: block; }
.sp-root .plyr {
  --plyr-color-main: var(--sp-accent);
  --plyr-video-background: #000;
  height: 100%;
}
.sp-root .plyr video { object-fit: contain; }

/* Server bar */
.sp-server-bar {
  display: flex; align-items: center; gap: 12px;
  padding: 10px 14px;
  background: var(--sp-surface); border-top: 1px solid var(--sp-border);
  flex-wrap: wrap;
}
.sp-server-bar__label {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 11px; font-weight: 700; text-transform: uppercase;
  letter-spacing: .08em; color: var(--sp-text-muted); flex-shrink: 0;
}
.sp-server-list { display: flex; flex-wrap: wrap; gap: 6px; }

/* Server buttons */
.sp-server-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 5px 13px 5px 10px; border-radius: 99px;
  border: 1px solid var(--sp-border); background: var(--sp-surface-2);
  color: var(--sp-text); font-size: 12px; font-weight: 500; cursor: pointer;
  transition: background .18s, border-color .18s, box-shadow .18s;
}
.sp-server-btn:hover { background: var(--sp-accent-glow); border-color: var(--sp-accent); }
.sp-server-btn--active {
  background: var(--sp-accent-glow); border-color: var(--sp-accent);
  box-shadow: 0 0 0 2px var(--sp-accent-glow); color: #fff; font-weight: 600;
}

/* Colour dot */
.sp-server-dot {
  width: 7px; height: 7px; border-radius: 50%;
  display: inline-block; flex-shrink: 0; background: #94a3b8;
}
.sp-server-dot.sp-badge--vidplay  { background: var(--sp-vidplay); }
.sp-server-dot.sp-badge--filemoon { background: var(--sp-filemoon); }
.sp-server-dot.sp-badge--mycloud  { background: var(--sp-mycloud); }
.sp-server-dot.sp-badge--mp4      { background: var(--sp-mp4); }

.sp-server-name {
  max-width: 130px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.sp-server-tag {
  font-size: 9px; font-weight: 700; letter-spacing: .05em;
  padding: 1px 5px; border-radius: 4px;
  background: rgba(108,99,255,0.22); color: var(--sp-accent); flex-shrink: 0;
}

/* Responsive */
@media (max-width: 480px) {
  .sp-server-bar { padding: 8px 10px; gap: 8px; }
  .sp-server-btn { font-size: 11px; padding: 4px 10px 4px 8px; }
  .sp-server-name { max-width: 90px; }
}
`;
