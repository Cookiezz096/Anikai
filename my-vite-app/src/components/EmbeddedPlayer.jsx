import React, { useState, useMemo } from "react";
import { Server, ShieldCheck, Maximize2, RotateCcw } from "lucide-react";

/**
 * EmbeddedPlayer.jsx
 *
 * Dedicated inline streaming player container utilizing active free streaming embed endpoints.
 * Automatically constructs dynamic endpoints (vidsrc.to, videasy, vidlink, multiembed)
 * so movies and TV shows play inline on the watch page without requiring external directory navigation.
 */
export default function EmbeddedPlayer({
  id = "27205",
  tmdbId,
  mediaType = "movie",
  type,
  season = 1,
  episode = 1,
  title = "",
  onServerChange,
}) {
  const currentId = tmdbId || id;
  const currentType = type || mediaType || "movie";
  const isTv = currentType === "tv";

  // Active free streaming embed endpoints
  const servers = useMemo(() => {
    return [
      {
        id: "vidsrcto",
        name: "VidSrc TO (Fast Stream)",
        badge: "1080p Ultra",
        url: isTv
          ? `https://vidsrc.to/embed/tv/${currentId}/${season}/${episode}`
          : `https://vidsrc.to/embed/movie/${currentId}`,
      },
      {
        id: "videasy",
        name: "Videasy Cloud",
        badge: "1080p Ultra",
        url: isTv
          ? `https://player.videasy.net/tv/${currentId}/${season}/${episode}`
          : `https://player.videasy.net/movie/${currentId}`,
      },
      {
        id: "vidlink",
        name: "VidLink Pro",
        badge: "1080p HD",
        url: isTv
          ? `https://vidlink.pro/tv/${currentId}/${season}/${episode}`
          : `https://vidlink.pro/movie/${currentId}`,
      },
      {
        id: "multiembed",
        name: "MultiEmbed VIP",
        badge: "Auto Mirror",
        url: isTv
          ? `https://multiembed.mov/?video_id=${currentId}&tmdb=1&s=${season}&e=${episode}`
          : `https://multiembed.mov/?video_id=${currentId}&tmdb=1`,
      },
      {
        id: "vidsrc",
        name: "VidSrc Active",
        badge: "Multi Stream",
        url: isTv
          ? `https://vidsrc.to/embed/tv/${currentId}/${season}/${episode}`
          : `https://vidsrc.to/embed/movie/${currentId}`,
      },
    ];
  }, [currentId, currentType, season, episode, isTv]);

  const [activeServerIdx, setActiveServerIdx] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);
  const currentServer = servers[activeServerIdx] || servers[0];

  const handleSelectServer = (idx) => {
    setActiveServerIdx(idx);
    if (onServerChange) onServerChange(servers[idx]);
  };

  const handleReload = () => {
    setReloadKey((k) => k + 1);
  };

  return (
    <div className="embedded-player-container" style={containerStyles}>
      {/* ── Server Switcher Bar ── */}
      <div className="embedded-player-toolbar" style={toolbarStyles}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Server size={15} color="#a991ff" />
          <span style={{ fontSize: "12px", fontWeight: "700", color: "#f7f7f8", letterSpacing: "0.5px" }}>
            SERVERS:
          </span>
        </div>

        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
          {servers.map((srv, idx) => {
            const isActive = idx === activeServerIdx;
            return (
              <button
                key={srv.id}
                type="button"
                onClick={() => handleSelectServer(idx)}
                style={{
                  ...btnStyles,
                  background: isActive ? "#8b5cf6" : "rgba(255, 255, 255, 0.05)",
                  borderColor: isActive ? "#a78bfa" : "rgba(255, 255, 255, 0.1)",
                  color: isActive ? "#ffffff" : "#b0b2c2",
                }}
              >
                <span>{srv.name}</span>
                <span style={{ fontSize: "10px", opacity: 0.8, marginLeft: "4px" }}>({srv.badge})</span>
              </button>
            );
          })}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginLeft: "auto" }}>
          <button
            type="button"
            onClick={handleReload}
            title="Reload Stream"
            style={{ ...btnStyles, padding: "6px 10px", background: "transparent" }}
          >
            <RotateCcw size={13} />
          </button>
        </div>
      </div>

      {/* ── Inline Video Player Iframe ── */}
      <div className="embedded-player-viewport" style={viewportStyles}>
        <iframe
          key={`${currentServer.url}-${reloadKey}`}
          src={currentServer.url}
          title={title || `${currentServer.name} Player`}
          style={iframeStyles}
          allowFullScreen
          allow="autoplay; fullscreen; picture-in-picture; encrypted-media; accelerometer; gyroscope; clipboard-write; web-share"
          referrerPolicy="origin-when-cross-origin"
          scrolling="no"
        />
      </div>

      {/* ── Protection & Status Footer ── */}
      <div style={footerStyles}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <ShieldCheck size={13} color="#34d399" />
          <span style={{ fontSize: "11px", color: "#34d399", fontWeight: "600" }}>
            Active Open-Embed Stream: {currentServer.name}
          </span>
        </div>
        <span style={{ fontSize: "11px", color: "#8b8d9c" }}>
          Playing inline with direct TMDB ID routing (No directory links)
        </span>
      </div>
    </div>
  );
}

const containerStyles = {
  background: "#10121a",
  border: "1px solid rgba(255, 255, 255, 0.08)",
  borderRadius: "14px",
  overflow: "hidden",
  margin: "16px 0",
};

const toolbarStyles = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  padding: "12px 16px",
  background: "rgba(16, 18, 26, 0.95)",
  borderBottom: "1px solid rgba(255, 255, 255, 0.07)",
  flexWrap: "wrap",
};

const btnStyles = {
  padding: "6px 12px",
  borderRadius: "8px",
  border: "1px solid rgba(255, 255, 255, 0.08)",
  cursor: "pointer",
  fontSize: "12px",
  fontWeight: "600",
  display: "inline-flex",
  alignItems: "center",
  transition: "all 0.15s ease",
};

const viewportStyles = {
  position: "relative",
  width: "100%",
  paddingTop: "56.25%", // 16:9 Aspect Ratio
  background: "#000000",
};

const iframeStyles = {
  position: "absolute",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  border: "none",
};

const footerStyles = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "10px 16px",
  background: "rgba(8, 9, 13, 0.8)",
  borderTop: "1px solid rgba(255, 255, 255, 0.06)",
  flexWrap: "wrap",
  gap: "8px",
};
