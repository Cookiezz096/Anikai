/**
 * watchHistory.js
 * LocalStorage manager for watch progress, user preferences, and playback history.
 */

const STORAGE_KEYS = {
  WATCH_PROGRESS: "mv_watch_progress_v1",
  PREFERRED_SERVER: "mv_pref_server_v1",
  PREFERRED_AUDIO: "mv_pref_audio_v1", // 'sub' | 'dub'
  AUTOPLAY_NEXT: "mv_autoplay_next_v1", // boolean
  SERVER_FAILURES: "mv_server_failures_v1", // { [serverId]: timestamp }
};

// ── Watch Progress Management ───────────────────────────────────────────────

/**
 * Gets all saved watch progress entries.
 */
export function getAllWatchProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.WATCH_PROGRESS);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * Generates key for watch progress entry.
 */
export function getProgressKey(type, id, season = 1, episode = 1) {
  if (type === "tv") {
    return `tv_${id}_s${season}_e${episode}`;
  }
  return `movie_${id}`;
}

/**
 * Saves watch progress for a title/episode.
 */
export function saveWatchProgress({
  type = "movie",
  id,
  title,
  season = 1,
  episode = 1,
  currentTime = 0,
  duration = 0,
  posterPath = "",
}) {
  if (!id) return;
  try {
    const all = getAllWatchProgress();
    const key = getProgressKey(type, id, season, episode);
    const progressPercent = duration > 0 ? Math.min(100, Math.round((currentTime / duration) * 100)) : 0;

    all[key] = {
      key,
      type,
      id: String(id),
      title: title || "Media",
      season: Number(season),
      episode: Number(episode),
      currentTime: Math.round(currentTime),
      duration: Math.round(duration),
      progressPercent,
      posterPath,
      updatedAt: Date.now(),
    };

    localStorage.setItem(STORAGE_KEYS.WATCH_PROGRESS, JSON.stringify(all));
  } catch {
    // ignore
  }
}

/**
 * Gets watch progress for a specific title/episode.
 */
export function getWatchProgress(type, id, season = 1, episode = 1) {
  const all = getAllWatchProgress();
  const key = getProgressKey(type, id, season, episode);
  return all[key] || null;
}

// ── Preferred Server & Audio Settings ───────────────────────────────────────

/**
 * Gets the user's preferred server ID.
 */
export function getPreferredServer() {
  try {
    return localStorage.getItem(STORAGE_KEYS.PREFERRED_SERVER) || null;
  } catch {
    return null;
  }
}

/**
 * Saves the user's preferred server ID.
 */
export function setPreferredServer(serverId) {
  if (!serverId) return;
  try {
    const baseId = serverId.replace(/-ssub$|-dub$/, "");
    localStorage.setItem(STORAGE_KEYS.PREFERRED_SERVER, baseId);
  } catch {
    // ignore
  }
}

/**
 * Gets the user's preferred audio category ('sub' | 'dub').
 */
export function getPreferredAudio() {
  try {
    return localStorage.getItem(STORAGE_KEYS.PREFERRED_AUDIO) || "sub";
  } catch {
    return "sub";
  }
}

/**
 * Saves the user's preferred audio category ('sub' | 'dub').
 */
export function setPreferredAudio(categoryKey) {
  if (!categoryKey) return;
  try {
    localStorage.setItem(
      STORAGE_KEYS.PREFERRED_AUDIO,
      categoryKey.toLowerCase() === "dub" ? "dub" : "sub"
    );
  } catch {
    // ignore
  }
}

/**
 * Gets the autoplay next episode setting (defaults to true).
 */
export function getAutoplayNext() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.AUTOPLAY_NEXT);
    return raw !== null ? JSON.parse(raw) : true;
  } catch {
    return true;
  }
}

/**
 * Sets the autoplay next episode setting.
 */
export function setAutoplayNext(enabled) {
  try {
    localStorage.setItem(STORAGE_KEYS.AUTOPLAY_NEXT, JSON.stringify(Boolean(enabled)));
  } catch {
    // ignore
  }
}

// ── Server Failure / Success Tracking for Ranking ───────────────────────────

/**
 * Records a playback failure on a server to demote it temporarily in ranking.
 */
export function recordServerFailure(serverId) {
  if (!serverId) return;
  try {
    const baseId = serverId.replace(/-ssub$|-dub$/, "");
    const raw = localStorage.getItem(STORAGE_KEYS.SERVER_FAILURES);
    const failures = raw ? JSON.parse(raw) : {};
    failures[baseId] = Date.now();
    localStorage.setItem(STORAGE_KEYS.SERVER_FAILURES, JSON.stringify(failures));
  } catch {
    // ignore
  }
}

/**
 * Clears recent failure mark for a server after a successful playback.
 */
export function recordServerSuccess(serverId) {
  if (!serverId) return;
  try {
    const baseId = serverId.replace(/-ssub$|-dub$/, "");
    const raw = localStorage.getItem(STORAGE_KEYS.SERVER_FAILURES);
    if (!raw) return;
    const failures = JSON.parse(raw);
    if (failures[baseId]) {
      delete failures[baseId];
      localStorage.setItem(STORAGE_KEYS.SERVER_FAILURES, JSON.stringify(failures));
    }
  } catch {
    // ignore
  }
}

/**
 * Checks if a server has failed within the last 15 minutes.
 */
export function hasRecentServerFailure(serverId) {
  try {
    const baseId = serverId.replace(/-ssub$|-dub$/, "");
    const raw = localStorage.getItem(STORAGE_KEYS.SERVER_FAILURES);
    if (!raw) return false;
    const failures = JSON.parse(raw);
    const lastFailed = failures[baseId];
    if (!lastFailed) return false;
    const isRecent = Date.now() - lastFailed < 15 * 60 * 1000;
    return isRecent;
  } catch {
    return false;
  }
}
