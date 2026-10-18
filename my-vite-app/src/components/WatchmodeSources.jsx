import React, { useState, useEffect, useCallback } from "react";
import {
  ExternalLink,
  Tv,
  Check,
  AlertCircle,
  LoaderCircle,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import {
  fetchWatchmodeSources,
  isWatchmodeConfigured,
  findWatchmodeIdByTmdb,
  KNOWN_WATCHMODE_IDS,
} from "../utils/watchmodeService";
import { getWatchProviders } from "../lib/tmdb";

/**
 * WatchmodeSources — Fully Automated Streaming Links Component
 *
 * Uses the stored Default Key from the secure environment variable.
 * No user input or API key prompt required — sources load automatically
 * when a TMDB ID or Watchmode ID is provided via props or URL parameter.
 */
export default function WatchmodeSources({
  movieId: propMovieId,
  tmdbId,
  mediaType = "movie",
  title = "",
}) {
  // Resolve effective ID: prop → URL param → tmdbId
  const [urlMovieId, setUrlMovieId] = useState("");
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const extracted =
        urlParams.get("id") ||
        urlParams.get("movieId") ||
        urlParams.get("tmdbId") ||
        "";
      setUrlMovieId(extracted);
    }
  }, []);

  const effectiveId = propMovieId || urlMovieId || tmdbId || "";

  const [sources, setSources]             = useState([]);
  const [loading, setLoading]             = useState(false);
  const [errorStatus, setErrorStatus]     = useState(null);
  const [fallbackSources, setFallbackSources] = useState([]);
  const [resolvedWmId, setResolvedWmId]   = useState("");
  const [selectedRegion]                  = useState("US");

  // ── TMDB JustWatch fallback ──────────────────────────────────────────────
  const loadTmdbFallback = useCallback(async (targetTmdbId) => {
    if (!targetTmdbId) return;
    try {
      const res = await getWatchProviders(mediaType, targetTmdbId);
      const regionData =
        res?.results?.[selectedRegion] ||
        res?.results?.["US"] ||
        Object.values(res?.results || {})[0];
      if (regionData) {
        const flatrate = (regionData.flatrate || []).map((p) => ({
          name: p.provider_name,
          type: "subscription",
          web_url: regionData.link || `https://www.themoviedb.org/${mediaType}/${targetTmdbId}/watch`,
        }));
        const rent = (regionData.rent || []).map((p) => ({
          name: p.provider_name,
          type: "rent",
          web_url: regionData.link || `https://www.themoviedb.org/${mediaType}/${targetTmdbId}/watch`,
        }));
        const buy = (regionData.buy || []).map((p) => ({
          name: p.provider_name,
          type: "buy",
          web_url: regionData.link || `https://www.themoviedb.org/${mediaType}/${targetTmdbId}/watch`,
        }));
        setFallbackSources([...flatrate, ...rent, ...buy]);
      }
    } catch (_) {}
  }, [mediaType, selectedRegion]);

  // ── Main loader: auto-resolves Watchmode ID from TMDB, then fetches sources ─
  const loadSources = useCallback(async () => {
    if (!effectiveId) {
      setErrorStatus("NO_ID");
      setSources([]);
      return;
    }

    setLoading(true);
    setErrorStatus(null);
    setSources([]);
    setFallbackSources([]);

    // Step 1: Resolve Watchmode title ID
    let wmId = effectiveId;

    // Check instant local mapping first (zero API requests)
    const localMap = KNOWN_WATCHMODE_IDS[String(effectiveId)];
    if (localMap) {
      wmId = effectiveId; // already a Watchmode ID
    } else {
      // Try reverse-lookup: treat effectiveId as a TMDB ID → find Watchmode ID
      const looked = await findWatchmodeIdByTmdb(effectiveId, mediaType);
      if (looked) {
        wmId = looked;
      }
      // else wmId stays = effectiveId (may already be a Watchmode ID)
    }
    setResolvedWmId(String(wmId));

    // Step 2: Check if Watchmode is configured (env key is auto-loaded)
    if (!isWatchmodeConfigured()) {
      // No key at all — use TMDB JustWatch as fallback silently
      setErrorStatus("NO_KEY");
      const targetTmdb = localMap?.tmdbId || tmdbId || effectiveId;
      await loadTmdbFallback(targetTmdb);
      setLoading(false);
      return;
    }

    // Step 3: Fetch from Watchmode API automatically
    try {
      const { sources: fetchedSources, error, message } = await fetchWatchmodeSources(wmId);

      if (error && error !== "NOT_FOUND") {
        console.warn("[WatchmodeSources]", message);
        setErrorStatus(error);
        const targetTmdb = localMap?.tmdbId || tmdbId || effectiveId;
        await loadTmdbFallback(targetTmdb);
      } else if (!fetchedSources || fetchedSources.length === 0) {
        setErrorStatus("EMPTY");
        const targetTmdb = localMap?.tmdbId || tmdbId || effectiveId;
        await loadTmdbFallback(targetTmdb);
      } else {
        setSources(fetchedSources);
        setErrorStatus(null);
      }
    } catch (e) {
      console.error("[WatchmodeSources] fetch error:", e);
      setErrorStatus("NETWORK_ERROR");
    } finally {
      setLoading(false);
    }
  }, [effectiveId, tmdbId, mediaType, loadTmdbFallback]);

  useEffect(() => {
    loadSources();
  }, [loadSources]);

  // Active display: Watchmode sources if available, otherwise TMDB fallback
  const activeSources = sources.length > 0 ? sources : fallbackSources;
  const isFallback    = sources.length === 0 && fallbackSources.length > 0;
  const isLive        = sources.length > 0;

  return (
    <div className="watchmode-section">
      {/* ── Header ── */}
      <div className="watchmode-header">
        <div className="watchmode-title-group">
          <Tv size={17} className="watchmode-icon" />
          <h3 className="watchmode-title">
            Streaming Links
            {title ? <span className="watchmode-target-title"> — {title}</span> : null}
          </h3>
          {/* Live indicator when Watchmode sources loaded */}
          {isLive && (
            <span className="watchmode-live-badge">
              <span className="watchmode-live-dot" />
              Watchmode Live
            </span>
          )}
          {isFallback && (
            <span className="watchmode-fallback-badge">
              TMDB Partners
            </span>
          )}
        </div>

        {/* Refresh button */}
        <button
          type="button"
          className="watchmode-refresh-btn"
          onClick={loadSources}
          disabled={loading}
          title="Refresh streaming links"
        >
          <RefreshCw size={14} className={loading ? "spin" : ""} />
        </button>
      </div>

      {/* ── EXACT DOM CONTAINER REQUIRED BY BLUEPRINT ── */}
      <div id="streaming-servers-container" className="streaming-servers-container">
        {loading ? (
          <div className="streaming-loading-state">
            <LoaderCircle size={22} className="spin" />
            <span>Loading streaming links automatically...</span>
          </div>
        ) : !effectiveId ? (
          <p className="streaming-notice-text">No title ID specified.</p>
        ) : activeSources.length === 0 ? (
          <div className="streaming-empty-state">
            <AlertCircle size={18} />
            <p>No streaming links found for this title in your region.</p>
            <button
              type="button"
              className="primary-btn sm-btn"
              onClick={loadSources}
            >
              <RefreshCw size={13} /> Retry
            </button>
          </div>
        ) : (
          <div className="streaming-btn-grid">
            {activeSources.map((source, idx) => (
              <a
                key={`${source.name}-${source.type}-${idx}`}
                href={source.web_url}
                target="_blank"
                rel="noopener noreferrer"
                className="stream-btn"
              >
                <span className="stream-btn-glow" />
                <span className="stream-btn-content">
                  <span className="stream-btn-title">Watch on {source.name}</span>
                  <span className="stream-btn-type">({source.type})</span>
                </span>
                <ExternalLink size={13} className="stream-btn-icon" />
              </a>
            ))}
          </div>
        )}
      </div>

      {/* ── Source attribution notice ── */}
      {!loading && activeSources.length > 0 && (
        <div className="watchmode-footer-note">
          {isLive ? (
            <>
              <Check size={12} />
              <span>
                {activeSources.length} live link{activeSources.length !== 1 ? "s" : ""} from Watchmode
                {resolvedWmId ? ` (ID: ${resolvedWmId})` : ""}
              </span>
            </>
          ) : (
            <>
              <Sparkles size={12} />
              <span>Showing authorized partners via TMDB JustWatch</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
