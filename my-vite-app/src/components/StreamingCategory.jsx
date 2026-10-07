import React from "react";
import {
  Check,
  Globe,
  Volume2,
  Subtitles,
  WifiOff,
  AlertTriangle,
  RefreshCw,
  ShieldOff,
} from "lucide-react";
import ReleaseStatusBadge from "./ReleaseStatusBadge";
import { STATUS_TYPES } from "../utils/releaseUtils";
import {
  SERVER_HEALTH,
  AD_QUALITY,
  AD_QUALITY_LABEL,
  AD_QUALITY_CLASS,
  isServerPlayable,
  isAdQualityAcceptable,
} from "../data/sources";

/**
 * StreamingCategory Component
 * Renders a single category block (SUB / S-SUB / DUB) with its status badge and server list.
 * Evaluates title/episode-specific source health, hides unavailable/offline sources,
 * and shows Ad Quality badges on each server pill.
 */
export default function StreamingCategory({
  categoryKey = "sub",
  categoryLabel = "SUB",
  categoryConfig = null,
  activeCategoryKey = "sub",
  activeServerIndex = 0,
  onSelectCategory,
  onSelectServer,
  // Function returning title/episode-specific status: (source, categoryKey) => SERVER_HEALTH
  getSourceStatus = null,
  isCheckingHealth = false,
}) {
  if (!categoryConfig) return null;

  const allSources = categoryConfig.sources || [];
  const status = categoryConfig.status || STATUS_TYPES.AVAILABLE;
  const isCategorySelected =
    activeCategoryKey.toLowerCase() === categoryKey.toLowerCase();
  const isAvailable = status === STATUS_TYPES.AVAILABLE;

  // Filter sources to only playable servers for THIS specific title/episode
  const sources = allSources.filter((src) => {
    const srcStatus = getSourceStatus
      ? getSourceStatus(src, categoryKey)
      : src.health ?? SERVER_HEALTH.WORKING;
    const healthStr = typeof srcStatus === "object" ? srcStatus.health : srcStatus;
    return isServerPlayable(healthStr);
  });

  // Separate auto-selectable from excessive-ads (still shown, but visually flagged)
  const acceptableSources = sources.filter((src) =>
    isAdQualityAcceptable(src.adQuality ?? AD_QUALITY.UNKNOWN)
  );
  const excessiveOnlySources = sources.filter(
    (src) => src.adQuality === AD_QUALITY.EXCESSIVE_ADS
  );
  const allExcessive =
    sources.length > 0 && acceptableSources.length === 0;

  const offlineCount = allSources.length - sources.length;

  // Category icon
  let categoryIcon = <Subtitles size={15} />;
  if (categoryKey.toLowerCase() === "dub") {
    categoryIcon = <Volume2 size={15} />;
  } else if (categoryKey.toLowerCase() === "ssub") {
    categoryIcon = <Globe size={15} />;
  }

  function getHealthIcon(source) {
    const srcStatus = getSourceStatus
      ? getSourceStatus(source, categoryKey)
      : source.health ?? SERVER_HEALTH.WORKING;

    const healthStr = typeof srcStatus === "object" ? srcStatus.health : srcStatus;

    if (
      healthStr === SERVER_HEALTH.WORKING ||
      healthStr === SERVER_HEALTH.UNVERIFIED
    ) {
      return null;
    }
    if (healthStr === SERVER_HEALTH.DEGRADED) {
      return (
        <AlertTriangle
          size={10}
          className="server-health-icon degraded"
          title="High Latency / Degraded"
        />
      );
    }
    if (healthStr === SERVER_HEALTH.UNAVAILABLE) {
      return (
        <AlertTriangle
          size={10}
          className="server-health-icon offline"
          title="Media Source Unavailable for this title"
        />
      );
    }
    if (healthStr === SERVER_HEALTH.OFFLINE) {
      return (
        <WifiOff
          size={10}
          className="server-health-icon offline"
          title="Provider Offline"
        />
      );
    }
    return null;
  }

  function hasEnglishSub(source) {
    const srcStatus = getSourceStatus
      ? getSourceStatus(source, categoryKey)
      : null;
    if (typeof srcStatus === "object" && srcStatus.englishSubtitle) return true;
    if (Array.isArray(source.subtitles)) {
      return source.subtitles.some(
        (s) =>
          s.languageCode?.toLowerCase() === "en" ||
          s.language?.toLowerCase().includes("english")
      );
    }
    return false;
  }

  /**
   * Renders the Ad Quality indicator for a server pill.
   * Only shows a badge for MODERATE_ADS, EXCESSIVE_ADS and UNKNOWN — clean/low are silent.
   */
  function AdQualityBadge({ adQuality }) {
    if (
      !adQuality ||
      adQuality === AD_QUALITY.CLEAN ||
      adQuality === AD_QUALITY.LOW_ADS
    ) {
      return null;
    }
    const label = AD_QUALITY_LABEL[adQuality] ?? "Unknown Ads";
    const cls = AD_QUALITY_CLASS[adQuality] ?? "ad-unknown";
    return (
      <span className={`server-ad-quality-badge ${cls}`} title={`Ad Level: ${label}`}>
        {adQuality === AD_QUALITY.EXCESSIVE_ADS ? "⚠ Ads" : "Ads"}
      </span>
    );
  }

  return (
    <div
      className={`streaming-category-block ${isCategorySelected ? "category-active-block" : ""} ${
        !isAvailable ? "category-locked-block" : ""
      }`}
    >
      <div
        className="streaming-category-header"
        onClick={() => onSelectCategory && onSelectCategory(categoryKey)}
      >
        <div className="category-header-left">
          <div className="category-type-pill">
            {categoryIcon}
            <span className="category-name">{categoryLabel}</span>
          </div>
          <span className="category-count">
            {isAvailable ? (
              <>
                {sources.length}{" "}
                {sources.length === 1 ? "Server" : "Servers"}
                {offlineCount > 0 && (
                  <span
                    className="category-offline-count"
                    title={`${offlineCount} server(s) unavailable for this title/episode`}
                  >
                    {" "}· {offlineCount} unavailable
                  </span>
                )}
                {isCheckingHealth && (
                  <RefreshCw
                    size={10}
                    className="health-check-spinner"
                    title="Checking source availability…"
                  />
                )}
              </>
            ) : (
              "Locked"
            )}
          </span>
        </div>

        <div className="category-header-right">
          <ReleaseStatusBadge
            status={status}
            targetDate={categoryConfig.releaseAt}
            size="sm"
          />
        </div>
      </div>

      <div className="category-servers-row">
        {isAvailable ? (
          sources.length > 0 ? (
            <>
              {/* Warning shown when all available providers have excessive ads */}
              {allExcessive && (
                <div className="category-excessive-ads-warning">
                  <ShieldOff size={14} />
                  <span>
                    All available sources have excessive ads. Select one below or try a different category.
                  </span>
                </div>
              )}

              {sources.map((srv, index) => {
                const isServerActive =
                  isCategorySelected && activeServerIndex === index;
                const displayName = srv.name || `Server ${index + 1}`;
                const badge = srv.badge || srv.quality || "1080p HD";
                const badgeClass = srv.badgeClass || "badge-fhd";
                const isExcessive =
                  srv.adQuality === AD_QUALITY.EXCESSIVE_ADS;

                return (
                  <button
                    key={srv.id || `${srv.name}-${index}`}
                    type="button"
                    className={`server-pill-btn ${isServerActive ? "active" : ""} ${
                      isExcessive ? "server-pill-excessive-ads" : ""
                    }`}
                    onClick={() => onSelectServer(categoryKey, index, srv)}
                    title={`${displayName} — ${badge}${srv.tag ? " · " + srv.tag : ""}${
                      isExcessive ? " · ⚠ Excessive Ads" : ""
                    }`}
                  >
                    <span className="server-pill-name">{displayName}</span>
                    {badge && (
                      <span className={`server-pill-badge ${badgeClass}`}>
                        {badge}
                      </span>
                    )}
                    {hasEnglishSub(srv) && (
                      <span className="server-eng-sub-badge" title="English subtitles verified">🔤 EN</span>
                    )}
                    <AdQualityBadge adQuality={srv.adQuality} />
                    {getHealthIcon(srv)}
                    {isServerActive && (
                      <Check size={12} className="server-check-icon" />
                    )}
                  </button>
                );
              })}
            </>
          ) : (
            // All servers for this category are unavailable for this title/episode
            <div className="category-no-servers-msg">
              <div className="category-no-servers-header">
                <WifiOff size={15} />
                <b>No working servers available for this title</b>
              </div>
              <span className="category-offline-hint">
                All {allSources.length} configured source
                {allSources.length !== 1 ? "s are" : " is"} currently offline or
                their playback manifest is unavailable for this specific release.
              </span>
            </div>
          )
        ) : (
          <div
            className="category-unreleased-hint"
            onClick={() => onSelectCategory && onSelectCategory(categoryKey)}
          >
            <span>
              Click to view {categoryLabel} release countdown &amp; schedule
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
