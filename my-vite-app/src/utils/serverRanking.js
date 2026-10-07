/**
 * serverRanking.js
 * Automatically ranks eligible streaming sources to select the optimal server
 * dynamically based on:
 *   - Episode-level subtitle availability
 *   - Provider health (WORKING > UNVERIFIED > DEGRADED)
 *   - Ad quality (CLEAN > LOW_ADS > MODERATE_ADS)
 *   - User preferred server
 *   - Recent failure history
 *
 * Providers marked EXCESSIVE_ADS are excluded from auto-ranking entirely.
 * They can still appear in the UI for manual selection.
 */

import { SERVER_HEALTH, AD_QUALITY, AD_QUALITY_SCORE, isServerPlayable, isAdQualityAcceptable } from "../data/sources.js";
import { getPreferredServer, hasRecentServerFailure } from "./watchHistory.js";

/**
 * Computes a priority score for a streaming source based on:
 *   - English subtitles (+100)
 *   - Any subtitles (+50)
 *   - Health tier: WORKING (+50), UNVERIFIED (+30), DEGRADED (0)
 *   - Ad quality: CLEAN (+40), LOW_ADS (+25), MODERATE_ADS (+10), EXCESSIVE_ADS (-999)
 *   - User preferred server (+30)
 *   - Recommended flag (+15)
 *   - Quality badge (+5)
 *   - Recent failure (-40)
 */
export function scoreSource(source, sourceStatus = SERVER_HEALTH.WORKING) {
  if (!source) return -999;

  const healthStr = typeof sourceStatus === "object" ? sourceStatus.health : sourceStatus;

  if (!isServerPlayable(healthStr)) return -999;

  // Immediately reject EXCESSIVE_ADS providers from auto-ranking
  const adQuality = source.adQuality ?? AD_QUALITY.UNKNOWN;
  if (!isAdQualityAcceptable(adQuality)) return -999;

  let score = 50;

  // 1. Subtitle Priority
  if (typeof sourceStatus === "object") {
    if (sourceStatus.englishSubtitle) {
      score += 100;
    } else if (sourceStatus.subtitles && sourceStatus.subtitles.length > 0) {
      score += 50;
    }
  }

  // 2. Health tier scoring
  if (healthStr === SERVER_HEALTH.WORKING) {
    score += 50;
  } else if (healthStr === SERVER_HEALTH.UNVERIFIED) {
    score += 30;
  } else if (healthStr === SERVER_HEALTH.DEGRADED) {
    score += 0;
  }

  // 3. Ad quality scoring — cleaner = higher score
  const adScore = AD_QUALITY_SCORE[adQuality] ?? AD_QUALITY_SCORE[AD_QUALITY.UNKNOWN];
  // Invert: lower ad score number = cleaner = higher ranking bonus
  score += Math.max(0, 40 - adScore * 15);

  // 4. User preferred server match
  const preferredId = getPreferredServer();
  const baseId = source.id?.replace(/-ssub$|-dub$/, "");
  if (preferredId && baseId === preferredId) {
    score += 30;
  }

  // 5. Recommended / stability flag from registry
  if (source.recommended) {
    score += 15;
  }

  // 6. Quality badge bonus
  if (source.badgeClass === "badge-fhd") {
    score += 5;
  }

  // 7. Recent failure penalty
  if (hasRecentServerFailure(source.id)) {
    score -= 40;
  }

  return score;
}

/**
 * Takes an array of sources, filters to only playable AND ad-acceptable ones
 * for this title/episode, and returns them ranked by optimal playback quality.
 *
 * EXCESSIVE_ADS sources are excluded from auto-selection.
 */
export function rankSources(sources = [], getSourceStatusFn = null, categoryKey = "sub") {
  if (!Array.isArray(sources) || sources.length === 0) return [];

  const scored = sources
    .map((src, originalIndex) => {
      const status = getSourceStatusFn
        ? getSourceStatusFn(src, categoryKey)
        : src.health ?? SERVER_HEALTH.WORKING;

      const healthStr = typeof status === "object" ? status.health : status;
      const score = scoreSource(src, status);

      return {
        source: src,
        originalIndex,
        status,
        score,
        isPlayable: isServerPlayable(healthStr),
        isAdAcceptable: isAdQualityAcceptable(src.adQuality ?? AD_QUALITY.UNKNOWN),
      };
    })
    .filter((item) => item.isPlayable && item.score > -999);

  // Sort descending by score
  scored.sort((a, b) => b.score - a.score);

  return scored;
}

/**
 * Automatically selects the best available source index from a sources list,
 * excluding EXCESSIVE_ADS providers.
 */
export function getBestSourceIndex(sources = [], getSourceStatusFn = null, categoryKey = "sub") {
  const ranked = rankSources(sources, getSourceStatusFn, categoryKey);
  if (ranked.length === 0) return 0;
  return ranked[0].originalIndex;
}

/**
 * Returns true if ALL available sources for a category have excessive ads.
 * Used to show a warning to the user instead of auto-switching.
 */
export function allSourcesExcessive(sources = []) {
  if (!Array.isArray(sources) || sources.length === 0) return false;
  return sources.every(
    (src) => src.adQuality === AD_QUALITY.EXCESSIVE_ADS
  );
}
