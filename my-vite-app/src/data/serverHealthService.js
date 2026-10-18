/**
 * serverHealthService.js
 *
 * Comprehensive Streaming Health Check & Manifest Verification Service
 * supporting Provider-Level AND Title/Episode-Specific Source Availability.
 */

import {
  SERVERS,
  SERVER_HEALTH,
  CONTENT_TYPES,
  getSourceHealthKey,
  isServerPlayable,
} from "./sources.js";

const CACHE_PREFIX = "srv_health_v6_";
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache

const REMOVED_DEAD_PROVIDERS = [
  "vidsrcpro",
  "vidsrccc",
  "autoembedcc",
  "embedsu",
  "superembed",
  "smashystream",
  "moviesapi",
  "vidsrcin",
];

// In-memory title/episode source health map
export const sourceHealthState = {};

/**
 * Automatically purges legacy cache entries and keys for removed dead providers.
 */
export function purgeLegacyCache() {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (
        key.startsWith("srv_health_") ||
        REMOVED_DEAD_PROVIDERS.some((d) => key.includes(d))
      ) {
        if (!key.startsWith(CACHE_PREFIX)) {
          keysToRemove.push(key);
        }
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch {
    // localStorage may be disabled
  }
}

// Automatically clear legacy cache on load
purgeLegacyCache();

/**
 * Reads cached health state from localStorage.
 */
function readCache(key) {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.ts > CACHE_TTL_MS) {
      localStorage.removeItem(CACHE_PREFIX + key);
      return null;
    }
    if (parsed.data) return parsed.data;
    if (parsed.health) return { health: parsed.health, subtitles: [], englishSubtitle: false };
    return null;
  } catch {
    return null;
  }
}

/**
 * Writes health state to localStorage.
 */
function writeCache(key, dataObj) {
  try {
    localStorage.setItem(
      CACHE_PREFIX + key,
      JSON.stringify({ data: dataObj, ts: Date.now() })
    );
  } catch {
    // localStorage may be disabled or quota reached
  }
}

/**
 * Gets the title/episode-specific health status for a given source key.
 * Falls back to provider-level health if no title-specific status exists.
 */
export function getSourceHealth(sourceKey, fallbackServerId = null) {
  if (sourceHealthState[sourceKey]) {
    return sourceHealthState[sourceKey];
  }
  const cached = readCache(sourceKey);
  if (cached) {
    sourceHealthState[sourceKey] = cached;
    return cached;
  }
  if (fallbackServerId) {
    const baseId = fallbackServerId.replace(/-ssub$|-dub$/, "");
    const provCached = readCache(baseId);
    if (provCached) return provCached;
    const serverObj = SERVERS.find((s) => s.id === baseId);
    return { health: serverObj?.health ?? SERVER_HEALTH.WORKING, subtitles: [], englishSubtitle: false };
  }
  return { health: SERVER_HEALTH.WORKING, subtitles: [], englishSubtitle: false };
}

/**
 * Sets the title/episode-specific health status.
 */
export function setSourceHealth(sourceKey, health, subtitles = [], englishSubtitle = false) {
  const data = { health, subtitles, englishSubtitle };
  sourceHealthState[sourceKey] = data;
  writeCache(sourceKey, data);
}

export function hasEnglish(subtitles) {
  if (!Array.isArray(subtitles)) return false;
  return subtitles.some(s => 
    s.languageCode?.toLowerCase() === "en" || 
    s.language?.toLowerCase().includes("english")
  );
}

/**
 * Probes a video stream source or manifest endpoint.
 */
async function probeStreamSource(url, sourceObj, timeoutMs = 4500) {
  const defaultSubs = sourceObj?.subtitles || [];
  const defaultEng = hasEnglish(defaultSubs);

  if (!url || typeof url !== "string") {
    return { health: SERVER_HEALTH.OFFLINE, subtitles: [], englishSubtitle: false };
  }

  // Simulated test endpoints
  if (url.includes("broken-anime") || url.includes("unavailable-")) {
    return { health: SERVER_HEALTH.UNAVAILABLE, subtitles: defaultSubs, englishSubtitle: defaultEng };
  }
  if (url.includes("offline-down-server")) {
    return { health: SERVER_HEALTH.OFFLINE, subtitles: defaultSubs, englishSubtitle: defaultEng };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  // Step 1: Attempt standard CORS fetch to inspect response status and body
  try {
    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timer);

    if (response.status === 404 || response.status === 410 || response.status === 403) {
      return { health: SERVER_HEALTH.UNAVAILABLE, subtitles: defaultSubs, englishSubtitle: defaultEng };
    }
    if (response.status >= 500) {
      return { health: SERVER_HEALTH.DEGRADED, subtitles: defaultSubs, englishSubtitle: defaultEng };
    }

    if (response.ok) {
      let text = "";
      try {
        text = await response.text();
        const lower = text.toLowerCase();
        if (
          lower.includes("video not found") ||
          lower.includes("media unavailable") ||
          lower.includes("file was deleted") ||
          lower.includes("stream expired") ||
          lower.includes('"error":') ||
          lower.includes("no stream available")
        ) {
          return { health: SERVER_HEALTH.UNAVAILABLE, subtitles: defaultSubs, englishSubtitle: defaultEng };
        }
      } catch {
        // Binary or stream body — valid
      }
      
      let discoveredEng = defaultEng;
      if (!discoveredEng && text) {
         const lower = text.toLowerCase();
         if ((lower.includes('kind="captions"') || lower.includes('kind="subtitles"')) && 
             (lower.includes('english') || lower.includes('en.vtt') || lower.includes('eng.vtt'))) {
             discoveredEng = true;
         }
      }
      return { health: SERVER_HEALTH.WORKING, subtitles: defaultSubs, englishSubtitle: discoveredEng };
    }

    return { health: SERVER_HEALTH.UNVERIFIED, subtitles: defaultSubs, englishSubtitle: defaultEng };
  } catch (err) {
    clearTimeout(timer);

    if (err?.name === "AbortError") {
      return { health: SERVER_HEALTH.DEGRADED, subtitles: defaultSubs, englishSubtitle: defaultEng };
    }

    // Step 2: Fallback for CORS-restricted third-party embeds
    const noCorsController = new AbortController();
    const noCorsTimer = setTimeout(() => noCorsController.abort(), timeoutMs);

    try {
      await fetch(url, {
        method: "GET",
        mode: "no-cors",
        signal: noCorsController.signal,
        cache: "no-store",
      });
      clearTimeout(noCorsTimer);
      // Host answered HTTP request -> Valid & Playable via iframe (Unverified payload)
      return { health: SERVER_HEALTH.UNVERIFIED, subtitles: defaultSubs, englishSubtitle: defaultEng };
    } catch (noCorsErr) {
      clearTimeout(noCorsTimer);
      if (noCorsErr?.name === "AbortError") {
        return { health: SERVER_HEALTH.DEGRADED, subtitles: defaultSubs, englishSubtitle: defaultEng };
      }
      return { health: SERVER_HEALTH.OFFLINE, subtitles: defaultSubs, englishSubtitle: defaultEng };
    }
  }
}

/**
 * Checks health for a single title/episode-specific source.
 */
export async function checkSingleSourceHealth({
  source,
  serverId,
  sourceUrl,
  type = "movie",
  id,
  season = 1,
  episode = 1,
  categoryKey = "sub",
}) {
  const effectiveServerId = serverId || source?.id || "srv";
  const effectiveUrl = sourceUrl || source?.url || "";
  const sourceKey = getSourceHealthKey({
    serverId: effectiveServerId,
    type,
    id,
    season,
    episode,
    categoryKey,
  });

  // Explicit declared health in source metadata (e.g. mock test cases or admin flags)
  if (source?.health && source.health !== SERVER_HEALTH.WORKING) {
    const defaultSubs = source.subtitles || [];
    const eng = hasEnglish(defaultSubs);
    setSourceHealth(sourceKey, source.health, defaultSubs, eng);
    return { sourceKey, health: source.health, subtitles: defaultSubs, englishSubtitle: eng };
  }

  // Check cached state
  const cached = readCache(sourceKey);
  if (cached) {
    sourceHealthState[sourceKey] = cached;
    return { sourceKey, ...cached };
  }

  // Check provider base health first: if provider is already known offline, source is offline
  const baseId = effectiveServerId.replace(/-ssub$|-dub$/, "");
  const provObj = SERVERS.find((s) => s.id === baseId);
  if (provObj?.health === SERVER_HEALTH.OFFLINE) {
    const defaultSubs = source?.subtitles || [];
    const eng = hasEnglish(defaultSubs);
    setSourceHealth(sourceKey, SERVER_HEALTH.OFFLINE, defaultSubs, eng);
    return { sourceKey, health: SERVER_HEALTH.OFFLINE, subtitles: defaultSubs, englishSubtitle: eng };
  }

  // Probe the actual title/episode URL
  const res = await probeStreamSource(effectiveUrl, source);
  setSourceHealth(sourceKey, res.health, res.subtitles, res.englishSubtitle);
  return { sourceKey, ...res };
}

/**
 * Global Architecture Check: checks exact episode and server.
 */
export async function checkServer({ animeId, season, episode, audioType, serverObj, type = "tv" }) {
   return checkSingleSourceHealth({
       source: serverObj,
       serverId: serverObj.id,
       sourceUrl: serverObj.url,
       type,
       id: animeId,
       season,
       episode,
       categoryKey: audioType
   });
}

/**
 * Checks health for all sources configured for a specific title/episode.
 */
export async function checkMediaSourcesHealth({
  releaseData,
  type = "movie",
  id,
  season = 1,
  episode = 1,
  onUpdate,
}) {
  if (!releaseData) return [];

  const categories = ["sub", "ssub", "dub"];
  const tasks = [];

  categories.forEach((catKey) => {
    const catConfig = releaseData[catKey];
    if (catConfig && Array.isArray(catConfig.sources)) {
      catConfig.sources.forEach((source) => {
        tasks.push(
          (async () => {
            const res = await checkSingleSourceHealth({
              source,
              serverId: source.id,
              sourceUrl: source.url,
              type,
              id,
              season,
              episode,
              categoryKey: catKey,
            });
            if (onUpdate) onUpdate(res.sourceKey, res);
            return res;
          })()
        );
      });
    }
  });

  return Promise.all(tasks);
}

/**
 * Reports a runtime playback failure for a specific title/episode.
 */
export function reportRuntimePlaybackIssue({
  serverId,
  type = "movie",
  id,
  season = 1,
  episode = 1,
  categoryKey = "sub",
  issueType = "unavailable",
}) {
  const sourceKey = getSourceHealthKey({
    serverId,
    type,
    id,
    season,
    episode,
    categoryKey,
  });

  const newStatus =
    issueType === "offline"
      ? SERVER_HEALTH.OFFLINE
      : SERVER_HEALTH.UNAVAILABLE;

  setSourceHealth(sourceKey, newStatus, [], false);

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("server-health-updated", {
        detail: { sourceKey, serverId, health: newStatus },
      })
    );
  }
}

/**
 * Clears health check cache.
 */
export function clearHealthCache() {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CACHE_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch {
    // ignore
  }
}
