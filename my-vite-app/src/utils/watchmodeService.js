/**
 * watchmodeService.js
 *
 * Fully-automated Watchmode API integration.
 * API key is sourced from the secure environment variable APP_WATCHMODE_API_KEY
 * (set in .env, picked up by Vite's envPrefix "APP_"). Falls back to localStorage
 * for any user-overridden key. All public functions resolve the key invisibly —
 * callers never need to pass or prompt for credentials.
 */

// ─── Secure key resolution (env → localStorage → empty) ──────────────────────
const ENV_KEY = import.meta?.env?.APP_WATCHMODE_API_KEY || "";

/**
 * Returns the active Watchmode API key.
 * Priority: environment variable (secure) → localStorage override → ""
 */
export function getWatchmodeApiKey() {
  if (ENV_KEY && ENV_KEY !== "YOUR_API_KEY_HERE") return ENV_KEY;
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("watchmode_api_key");
    if (stored && stored !== "YOUR_API_KEY_HERE") return stored;
  }
  return "";
}

/**
 * Allows a user to override the key at runtime (stored in localStorage).
 * Pass null / empty string to clear the override and revert to the env key.
 */
export function setWatchmodeApiKey(key) {
  if (typeof window === "undefined") return;
  if (!key) {
    localStorage.removeItem("watchmode_api_key");
  } else {
    localStorage.setItem("watchmode_api_key", key.trim());
  }
}

/** True when a valid key is available (env or override). */
export function isWatchmodeConfigured() {
  return Boolean(getWatchmodeApiKey());
}

// ─── Well-known ID mappings ───────────────────────────────────────────────────
// Watchmode Title IDs → TMDB IDs for instant zero-request resolution.
export const KNOWN_WATCHMODE_IDS = {
  "1352293": { tmdbId: "27205",  title: "Inception",                 type: "movie", year: 2010 },
  "1354312": { tmdbId: "157336", title: "Interstellar",              type: "movie", year: 2014 },
  "1342115": { tmdbId: "19995",  title: "Avatar",                    type: "movie", year: 2009 },
  "1342116": { tmdbId: "76600",  title: "Avatar: The Way of Water",  type: "movie", year: 2022 },
  "1172551": { tmdbId: "550",    title: "Fight Club",                type: "movie", year: 1999 },
  "1262846": { tmdbId: "1396",   title: "Breaking Bad",              type: "tv",    year: 2008 },
  "1158406": { tmdbId: "680",    title: "Pulp Fiction",              type: "movie", year: 1994 },
  "1443034": { tmdbId: "299536", title: "Avengers: Infinity War",    type: "movie", year: 2018 },
  "1443035": { tmdbId: "299534", title: "Avengers: Endgame",         type: "movie", year: 2019 },
  "1292757": { tmdbId: "278",    title: "The Shawshank Redemption",  type: "movie", year: 1994 },
  "1293564": { tmdbId: "238",    title: "The Godfather",             type: "movie", year: 1972 },
  "1262847": { tmdbId: "1399",   title: "Game of Thrones",           type: "tv",    year: 2011 },
  "3173903": { tmdbId: "94997",  title: "House of the Dragon",       type: "tv",    year: 2022 },
  "1402940": { tmdbId: "76479",  title: "The Boys",                  type: "tv",    year: 2019 },
  "1292027": { tmdbId: "1668",   title: "Friends",                   type: "tv",    year: 1994 },
};

// ─── Core API helpers ─────────────────────────────────────────────────────────

/**
 * Fetches streaming sources from the Watchmode API for a given Watchmode title ID.
 * Automatically uses the stored Default Key — no credentials needed from caller.
 *
 * @param {string|number} movieId  - Watchmode title ID
 * @param {string} [overrideKey]   - Optional key override (usually unused)
 * @returns {Promise<{sources: Array, error: string|null, message: string}>}
 */
export async function fetchWatchmodeSources(movieId, overrideKey = "") {
  if (!movieId) throw new Error("No movie ID specified.");

  const apiKey = (overrideKey || getWatchmodeApiKey()).trim();
  if (!apiKey) {
    return {
      sources: [],
      error: "NO_KEY",
      message: "Watchmode API key not configured.",
    };
  }

  const apiUrl = `https://api.watchmode.com/v1/title/${movieId}/sources/?apiKey=${apiKey}`;

  try {
    const res = await fetch(apiUrl);
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        return { sources: [], error: "INVALID_KEY", message: "Invalid Watchmode API key." };
      }
      if (res.status === 404) {
        return { sources: [], error: "NOT_FOUND", message: "No sources found for this title ID." };
      }
      throw new Error(`Watchmode API error: HTTP ${res.status}`);
    }

    const data = await res.json();
    const rawSources = Array.isArray(data) ? data : data?.sources || [];

    // Deduplicate by name + type + region
    const seen = new Set();
    const sources = [];
    for (const s of rawSources) {
      const key = `${s.name || s.source_id}-${s.type}-${s.region || "US"}`;
      if (!seen.has(key) && s.web_url) {
        seen.add(key);
        sources.push({
          source_id: s.source_id,
          name:      s.name      || "Provider",
          type:      s.type      || "sub",
          region:    s.region    || "US",
          web_url:   s.web_url,
          format:    s.format    || "HD",
          price:     s.price,
        });
      }
    }
    return { sources, error: null };
  } catch (err) {
    console.warn("[watchmodeService] Error fetching sources:", err);
    return { sources: [], error: "NETWORK_ERROR", message: err.message };
  }
}

/**
 * Fetches full title details from Watchmode (title, year, poster, tmdb_id, imdb_id, etc.)
 * Automatically uses the stored Default Key.
 *
 * @param {string|number} movieId  - Watchmode title ID
 * @returns {Promise<object|null>}
 */
export async function fetchWatchmodeDetails(movieId) {
  if (!movieId) return null;
  const apiKey = getWatchmodeApiKey();
  if (!apiKey) return null;

  try {
    const res = await fetch(
      `https://api.watchmode.com/v1/title/${movieId}/details/?apiKey=${apiKey}`
    );
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.warn("[watchmodeService] Details fetch error:", e);
    return null;
  }
}

/**
 * Searches Watchmode by TMDB ID to find the corresponding Watchmode title ID.
 * Used to cross-reference when a user clicks a TMDB title.
 * Automatically uses the stored Default Key.
 *
 * @param {string|number} tmdbId
 * @param {"movie"|"tv"} type
 * @returns {Promise<string|null>} - Watchmode title ID, or null if not found
 */
export async function findWatchmodeIdByTmdb(tmdbId, type = "movie") {
  if (!tmdbId) return null;
  const apiKey = getWatchmodeApiKey();
  if (!apiKey) return null;

  // First: check our instant local mapping (no request needed)
  for (const [wmId, meta] of Object.entries(KNOWN_WATCHMODE_IDS)) {
    if (String(meta.tmdbId) === String(tmdbId) && meta.type === type) return wmId;
  }

  try {
    const field = type === "tv" ? "tmdb_tv_id" : "tmdb_movie_id";
    const res = await fetch(
      `https://api.watchmode.com/v1/search/?apiKey=${apiKey}&search_field=${field}&search_value=${tmdbId}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data?.title_results?.[0]?.id || null;
  } catch (e) {
    console.warn("[watchmodeService] TMDB reverse lookup error:", e);
    return null;
  }
}

/**
 * Searches Watchmode by title name (text search).
 * Used when a user types a query in the search bar.
 * Automatically uses the stored Default Key.
 *
 * @param {string} query           - Search term
 * @param {"movie"|"tv"|""} type   - Optional filter
 * @returns {Promise<Array>}       - Array of title result objects
 */
export async function searchWatchmodeByTitle(query, type = "") {
  if (!query) return [];
  const apiKey = getWatchmodeApiKey();
  if (!apiKey) return [];

  try {
    let url = `https://api.watchmode.com/v1/search/?apiKey=${apiKey}&search_field=name&search_value=${encodeURIComponent(query)}`;
    if (type === "movie") url += "&types=movie";
    else if (type === "tv")  url += "&types=tv_series,tv_miniseries,tv_movie";
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return data?.title_results || [];
  } catch (e) {
    console.warn("[watchmodeService] Title search error:", e);
    return [];
  }
}

/**
 * High-level helper: given a TMDB ID, automatically finds the Watchmode ID
 * then fetches all streaming sources in one call. Returns sources array directly.
 *
 * @param {string|number} tmdbId
 * @param {"movie"|"tv"} type
 * @returns {Promise<Array>} sources (empty if nothing found)
 */
export async function getSourcesForTmdbId(tmdbId, type = "movie") {
  const wmId = await findWatchmodeIdByTmdb(tmdbId, type);
  if (!wmId) return [];
  const { sources } = await fetchWatchmodeSources(wmId);
  return sources || [];
}
