import React, { useState, useEffect, useRef } from "react";
import {
  LoaderCircle,
  AlertTriangle,
  RotateCcw,
  RefreshCw,
  Play,
  X,
  FastForward,
  Check,
  Server,
  WifiOff,
  ShieldCheck,
  Shield,
  ShieldAlert,
} from "lucide-react";
import SkipTimingsOverlay from "./SkipTimingsOverlay";
import AutoNextOverlay from "./AutoNextOverlay";
import { adShield } from "../utils/adShield";
import {
  getWatchProgress,
  saveWatchProgress,
  recordServerSuccess,
  recordServerFailure,
} from "../utils/watchHistory";

/**
 * EnhancedEmbedPlayer Component
 * Handles streaming iframe playback with real-time loading UI, auto-failover,
 * resume progress, skip timing overlays, and graceful error states.
 */
export default function EnhancedEmbedPlayer({
  server = null,
  serverName = "Server 1",
  serverIndex = 0,
  totalServers = 1,
  reloadKey = 0,
  isTrailer = false,
  trailerUrl = "",
  skipTimings = null,
  mediaType = "movie",
  mediaId = "",
  mediaTitle = "",
  season = 1,
  episode = 1,
  hasNextEpisode = false,
  nextEpisodeNumber = 2,
  nextEpisodeTitle = "",
  onPlayNextEpisode = null,
  onFailover = null, // (failedServerId) => void
  onManualReload = null,
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [failoverMessage, setFailoverMessage] = useState("");
  const [hasError, setHasError] = useState(false);
  const [showAutoNext, setShowAutoNext] = useState(false);
  const [showResumeBanner, setShowResumeBanner] = useState(false);
  const [savedProgress, setSavedProgress] = useState(null);
  const [adShieldActive, setAdShieldActive] = useState(adShield.isShieldActive());
  const [blockedCount, setBlockedCount] = useState(adShield.getBlockedCount());

  const failTimeoutRef = useRef(null);
  const progressIntervalRef = useRef(null);
  const currentUrl = isTrailer && trailerUrl ? trailerUrl : server?.url || "";

  // Subscribe to Ad Shield changes
  useEffect(() => {
    const unsubscribe = adShield.subscribe(({ enabled, blockedCount: count }) => {
      setAdShieldActive(enabled);
      setBlockedCount(count);
    });
    return () => unsubscribe();
  }, []);

  // Check for saved watch progress on title/episode change
  useEffect(() => {
    if (!isTrailer && mediaId) {
      const progress = getWatchProgress(mediaType, mediaId, season, episode);
      if (progress && progress.currentTime > 30) {
        setSavedProgress(progress);
        setShowResumeBanner(true);
      } else {
        setSavedProgress(null);
        setShowResumeBanner(false);
      }
    }
  }, [mediaType, mediaId, season, episode, isTrailer]);

  // Handle URL / server changes
  useEffect(() => {
    setIsLoading(true);
    setHasError(false);
    setFailoverMessage("");

    if (!currentUrl) {
      setIsLoading(false);
      setHasError(true);
      return;
    }

    // Safety timeout: if iframe doesn't respond or load within 12s, attempt graceful failover
    if (!isTrailer && onFailover) {
      failTimeoutRef.current = setTimeout(() => {
        if (isLoading) {
          handlePlaybackFailure("timeout");
        }
      }, 12000);
    }

    return () => {
      if (failTimeoutRef.current) clearTimeout(failTimeoutRef.current);
    };
  }, [currentUrl, reloadKey]);

  // Periodic watch progress tracking
  useEffect(() => {
    if (isTrailer || !mediaId) return;

    let elapsed = savedProgress?.currentTime || 0;
    progressIntervalRef.current = setInterval(() => {
      elapsed += 5;
      saveWatchProgress({
        type: mediaType,
        id: mediaId,
        title: mediaTitle,
        season,
        episode,
        currentTime: elapsed,
        duration: 1440, // standard duration estimate if not accessible from sandbox
      });
    }, 10000);

    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [mediaType, mediaId, season, episode, isTrailer]);

  function handleIframeLoad() {
    setIsLoading(false);
    setFailoverMessage("");
    if (failTimeoutRef.current) clearTimeout(failTimeoutRef.current);

    if (server?.id) {
      recordServerSuccess(server.id);
    }
  }

  function handlePlaybackFailure(reason = "error") {
    if (isTrailer) return;
    if (server?.id) {
      recordServerFailure(server.id);
    }

    if (onFailover && totalServers > 1) {
      setFailoverMessage(`${serverName} had a loading issue. Switching to next server…`);
      onFailover(server?.id);
    } else {
      setIsLoading(false);
      setHasError(true);
    }
  }

  function handleSkip(type, timestampSec) {
    // Send postMessage seek request if supported by embed
    try {
      const iframe = document.querySelector("iframe.enhanced-video-player");
      if (iframe?.contentWindow) {
        iframe.contentWindow.postMessage(
          JSON.stringify({ event: "seek", time: timestampSec }),
          "*"
        );
      }
    } catch {
      // Cross-origin sandbox restricts direct seek on external players
    }
  }

  function formatTime(sec) {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins}:${s.toString().padStart(2, "0")}`;
  }

  return (
    <div className="player-wrapper enhanced-player-wrapper">
      {/* ── Resume Playback Banner ── */}
      {showResumeBanner && savedProgress && (
        <div className="resume-playback-banner">
          <div className="resume-banner-left">
            <Play size={13} fill="currentColor" />
            <span>
              Resume from <b>{formatTime(savedProgress.currentTime)}</b>?
            </span>
          </div>
          <div className="resume-banner-actions">
            <button
              type="button"
              className="resume-confirm-btn"
              onClick={() => {
                setShowResumeBanner(false);
                handleSkip("resume", savedProgress.currentTime);
              }}
            >
              Resume
            </button>
            <button
              type="button"
              className="resume-dismiss-btn"
              onClick={() => setShowResumeBanner(false)}
            >
              Start Over
            </button>
          </div>
        </div>
      )}

      {/* ── Loading Overlay ── */}
      {isLoading && !hasError && (
        <div className="player-loading-overlay">
          <LoaderCircle size={36} className="spin loading-spinner" />
          <div className="loading-text-group">
            <span className="loading-main-text">
              {failoverMessage || `Connecting to ${isTrailer ? "Official HD Trailer" : serverName}…`}
            </span>
            <span className="loading-sub-text">
              High-definition stream · Multi-mirror enabled
            </span>
          </div>
        </div>
      )}

      {/* ── Playback Error State ── */}
      {hasError && (
        <div className="player-error-overlay">
          <div className="player-error-card">
            <div className="error-icon-wrap">
              <WifiOff size={36} />
            </div>
            <h3 className="error-heading">Stream Unavailable</h3>
            <p className="error-desc">
              Unable to establish a reliable stream with the currently selected server.
            </p>
            <div className="error-actions">
              {onFailover && totalServers > 1 && (
                <button
                  type="button"
                  className="primary-btn error-action-btn"
                  onClick={() => onFailover(server?.id)}
                >
                  <Server size={14} />
                  <span>Try Next Server</span>
                </button>
              )}
              <button
                type="button"
                className="ghost-btn error-action-btn"
                onClick={onManualReload}
              >
                <RotateCcw size={14} />
                <span>Retry Stream</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Ad Shield Floating Protection Badge ── */}
      {!isTrailer && (
        <div className={`player-ad-shield-pill ${adShieldActive ? "active" : "disabled"}`}>
          <button
            type="button"
            className="ad-shield-toggle-btn"
            onClick={() => adShield.setShieldEnabled(!adShieldActive)}
            title={
              adShieldActive
                ? "Ad Shield Active: Intrusive popups, redirects and clickjacking are blocked. Click to toggle."
                : "Ad Shield Disabled: Click to enable popup blocking."
            }
          >
            {adShieldActive ? (
              <>
                <ShieldCheck size={13} className="shield-active-icon" />
                <span>Ad Shield: Active</span>
                {blockedCount > 0 && (
                  <span className="shield-blocked-pill">{blockedCount} Blocked</span>
                )}
              </>
            ) : (
              <>
                <ShieldAlert size={13} className="shield-disabled-icon" />
                <span>Ad Shield: Off</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* ── Video Player Iframe ── */}
      {currentUrl && !hasError && (
        <iframe
          key={`${currentUrl}-${reloadKey}`}
          className={`video enhanced-video-player ${isLoading ? "loading" : "ready"}`}
          src={currentUrl}
          allow="autoplay; fullscreen; picture-in-picture; encrypted-media; accelerometer; gyroscope; clipboard-write; web-share"
          allowFullScreen
          referrerPolicy="origin-when-cross-origin"
          onLoad={handleIframeLoad}
          onError={() => handlePlaybackFailure("iframe_error")}
          title={isTrailer ? "Official HD Trailer" : `${serverName} Video Stream`}
        />
      )}

      {/* ── Skip Intro / Recap / Outro Buttons ── */}
      {!isLoading && !hasError && skipTimings && (
        <SkipTimingsOverlay skipTimings={skipTimings} onSkip={handleSkip} />
      )}

      {/* ── Auto-Next Episode Overlay ── */}
      {showAutoNext && hasNextEpisode && onPlayNextEpisode && (
        <AutoNextOverlay
          nextEpisodeNumber={nextEpisodeNumber}
          nextEpisodeTitle={nextEpisodeTitle}
          onPlayNext={() => {
            setShowAutoNext(false);
            onPlayNextEpisode();
          }}
          onCancel={() => setShowAutoNext(false)}
        />
      )}
    </div>
  );
}
