/**
 * sources.js
 * Streaming server registry with capability, health, and ad-quality metadata.
 *
 * Each server declares:
 *   - contentTypes: ['anime', 'movie', 'both']  — what content it can stream
 *   - supports.sub: boolean  — can serve SUB (subtitled) content
 *   - supports.dub: boolean  — can serve DUB (English/international dubbed) content
 *   - health: SERVER_HEALTH.*  — provider availability status
 *   - adQuality: AD_QUALITY.*  — popup/ad intrusion level (separate from health)
 *   - movie(id, imdb): function returning embed URL for movies
 *   - tv(id, s, e, imdb): function returning embed URL for TV/anime episodes
 */

// ─── Provider Health (availability) ────────────────────────────────────────
export const SERVER_HEALTH = {
  WORKING:     "working",     // Direct verified active & playable source
  UNVERIFIED:  "unverified",  // Valid endpoint reachable; browser CORS limits deep manifest inspection, treated as playable
  DEGRADED:    "degraded",    // High latency / slow response / timeout warning (playable)
  UNAVAILABLE: "unavailable", // Provider responds but source manifest is 404/broken/unauthorized (NOT playable)
  OFFLINE:     "offline",     // Host unreachable / DNS fail / connection refused (NOT playable)
};

// ─── Ad Quality (popup / ad intrusion — separate from health) ──────────────
export const AD_QUALITY = {
  CLEAN:         "clean",          // No ads or popups at all
  LOW_ADS:       "low_ads",        // Occasional, non-intrusive banner ads only
  MODERATE_ADS:  "moderate_ads",   // Pre-roll or interstitial ads, manageable
  EXCESSIVE_ADS: "excessive_ads",  // Non-stop popup tabs / redirect storms
  UNKNOWN:       "unknown",        // Not yet tested
};

// ─── Ad quality score for ranking (lower = more ad-friendly) ──────────────
export const AD_QUALITY_SCORE = {
  [AD_QUALITY.CLEAN]:         0,
  [AD_QUALITY.LOW_ADS]:       1,
  [AD_QUALITY.MODERATE_ADS]:  2,
  [AD_QUALITY.EXCESSIVE_ADS]: 3,
  [AD_QUALITY.UNKNOWN]:       2,  // Treat unknown as moderate-level risk
};

// ─── Human-readable labels for UI ─────────────────────────────────────────
export const AD_QUALITY_LABEL = {
  [AD_QUALITY.CLEAN]:         "No Ads",
  [AD_QUALITY.LOW_ADS]:       "Low Ads",
  [AD_QUALITY.MODERATE_ADS]:  "Moderate Ads",
  [AD_QUALITY.EXCESSIVE_ADS]: "Excessive Ads",
  [AD_QUALITY.UNKNOWN]:       "Unknown Ads",
};

// ─── CSS badge class for each tier ────────────────────────────────────────
export const AD_QUALITY_CLASS = {
  [AD_QUALITY.CLEAN]:         "ad-clean",
  [AD_QUALITY.LOW_ADS]:       "ad-low",
  [AD_QUALITY.MODERATE_ADS]:  "ad-moderate",
  [AD_QUALITY.EXCESSIVE_ADS]: "ad-excessive",
  [AD_QUALITY.UNKNOWN]:       "ad-unknown",
};

export const CONTENT_TYPES = {
  ANIME: "anime",
  MOVIE: "movie",
  BOTH:  "both",
};

// ─── Provider Registry ────────────────────────────────────────────────────
export const SERVERS = [
  // ── Anime + Movie servers supporting both SUB and DUB ─────────────────────
  {
    id: "vidlink",
    name: "VidLink HD",
    quality: "1080p Ultra HD",
    badge: "1080p Ultra",
    badgeClass: "badge-fhd",
    tag: "Minimal Ads · Fast",
    recommended: true,
    contentTypes: [CONTENT_TYPES.BOTH],
    supports: { sub: true, dub: true },
    health: SERVER_HEALTH.WORKING,
    adQuality: AD_QUALITY.LOW_ADS,
    movie: (id) => `https://vidlink.pro/movie/${id}`,
    tv: (id, s, e) => `https://vidlink.pro/tv/${id}/${s}/${e}`,
  },
  {
    id: "vidsrcto",
    name: "VidSrc TO",
    quality: "1080p Full HD",
    badge: "1080p HD",
    badgeClass: "badge-fhd",
    tag: "High Stability",
    recommended: true,
    contentTypes: [CONTENT_TYPES.BOTH],
    supports: { sub: true, dub: true },
    health: SERVER_HEALTH.WORKING,
    adQuality: AD_QUALITY.MODERATE_ADS,
    movie: (id) => `https://vidsrc.to/embed/movie/${id}`,
    tv: (id, s, e) => `https://vidsrc.to/embed/tv/${id}/${s}/${e}`,
  },
  {
    id: "vidsrcme",
    name: "VidSrc ME",
    quality: "1080p Full HD",
    badge: "1080p HD",
    badgeClass: "badge-fhd",
    tag: "Backup Mirror",
    recommended: false,
    contentTypes: [CONTENT_TYPES.BOTH],
    supports: { sub: true, dub: true },
    health: SERVER_HEALTH.WORKING,
    adQuality: AD_QUALITY.EXCESSIVE_ADS,
    movie: (id, imdb) =>
      `https://vidsrc.me/embed/movie?tmdb=${id}${imdb ? `&imdb=${imdb}` : ""}`,
    tv: (id, s, e, imdb) =>
      `https://vidsrc.me/embed/tv?tmdb=${id}&season=${s}&episode=${e}${imdb ? `&imdb=${imdb}` : ""}`,
  },

  // ── Anime-only servers (SUB focus) ────────────────────────────────────────
  {
    id: "autoembed",
    name: "AutoEmbed",
    quality: "1080p HD",
    badge: "Anime Edge",
    badgeClass: "badge-hd",
    tag: "Global Edge CDN · Anime",
    contentTypes: [CONTENT_TYPES.ANIME],
    supports: { sub: true, dub: false },
    health: SERVER_HEALTH.WORKING,
    adQuality: AD_QUALITY.LOW_ADS,
    movie: (id) => `https://player.autoembed.cc/embed/movie/${id}`,
    tv: (id, s, e) => `https://player.autoembed.cc/embed/tv/${id}/${s}/${e}`,
  },
  {
    id: "embedsu",
    name: "EmbedSu",
    quality: "1080p HD",
    badge: "SoftSub HD",
    badgeClass: "badge-hd",
    tag: "Fast HLS · Subtitles · Anime",
    contentTypes: [CONTENT_TYPES.ANIME],
    supports: { sub: true, dub: false },
    health: SERVER_HEALTH.WORKING,
    adQuality: AD_QUALITY.LOW_ADS,
    movie: (id) => `https://embed.su/embed/movie/${id}`,
    tv: (id, s, e) => `https://embed.su/embed/tv/${id}/${s}/${e}`,
  },

  // ── Movie-only servers ────────────────────────────────────────────────────
  {
    id: "superembed",
    name: "Cinezo Super",
    quality: "1080p HD",
    badge: "Multi-HD",
    badgeClass: "badge-multi",
    tag: "Multiple Built-in Mirrors",
    contentTypes: [CONTENT_TYPES.MOVIE],
    supports: { sub: true, dub: true },
    health: SERVER_HEALTH.WORKING,
    adQuality: AD_QUALITY.EXCESSIVE_ADS,
    movie: (id) => `https://multiembed.mov/?video_id=${id}&tmdb=1`,
    tv: (id, s, e) =>
      `https://multiembed.mov/?video_id=${id}&tmdb=1&s=${s}&e=${e}`,
  },
  {
    id: "videasy",
    name: "Videasy",
    quality: "1080p HD",
    badge: "Clean HD",
    badgeClass: "badge-hd",
    tag: "Clean HD Player",
    contentTypes: [CONTENT_TYPES.MOVIE],
    supports: { sub: true, dub: false },
    health: SERVER_HEALTH.WORKING,
    adQuality: AD_QUALITY.LOW_ADS,
    movie: (id) => `https://player.videasy.net/movie/${id}`,
    tv: (id, s, e) => `https://player.videasy.net/tv/${id}/${s}/${e}`,
  },
  {
    id: "2embed",
    name: "2Embed",
    quality: "HD Stream",
    badge: "HD Stream",
    badgeClass: "badge-hd",
    tag: "Backup Mirror",
    contentTypes: [CONTENT_TYPES.MOVIE],
    supports: { sub: true, dub: false },
    health: SERVER_HEALTH.WORKING,
    adQuality: AD_QUALITY.MODERATE_ADS,
    movie: (id) => `https://www.2embed.skin/embed/${id}`,
    tv: (id, s, e) => `https://www.2embed.skin/embedtv/${id}&s=${s}&e=${e}`,
  },

  // ── Test scenario servers ─────────────────────────────────────────────────
  {
    id: "test-broken-anime",
    name: "Anime Mirror (Broken Manifest)",
    quality: "1080p HD",
    badge: "Unavailable",
    badgeClass: "badge-hd",
    tag: "Simulated Broken Video Source",
    contentTypes: [CONTENT_TYPES.ANIME],
    supports: { sub: true, dub: false },
    health: SERVER_HEALTH.UNAVAILABLE,
    adQuality: AD_QUALITY.UNKNOWN,
    movie: () => "https://invalid-stream.example.com/broken-anime-movie",
    tv: () => "https://invalid-stream.example.com/broken-anime-manifest.m3u8",
  },
  {
    id: "test-unavailable-movie",
    name: "Cinema Server (Stream Unavailable)",
    quality: "1080p HD",
    badge: "Unavailable",
    badgeClass: "badge-hd",
    tag: "Simulated Missing Stream Token",
    contentTypes: [CONTENT_TYPES.MOVIE],
    supports: { sub: true, dub: true },
    health: SERVER_HEALTH.UNAVAILABLE,
    adQuality: AD_QUALITY.UNKNOWN,
    movie: () => "https://invalid-stream.example.com/unavailable-movie",
    tv: () => "https://invalid-stream.example.com/unavailable-tv",
  },
  {
    id: "test-offline-server",
    name: "Offline Provider Mirror",
    quality: "1080p HD",
    badge: "Offline",
    badgeClass: "badge-hd",
    tag: "Simulated Down Host",
    contentTypes: [CONTENT_TYPES.BOTH],
    supports: { sub: true, dub: true },
    health: SERVER_HEALTH.OFFLINE,
    adQuality: AD_QUALITY.UNKNOWN,
    movie: () => "https://offline-down-server-example-999.xyz/movie",
    tv: () => "https://offline-down-server-example-999.xyz/tv",
  },
  {
    id: "test-timeout-server",
    name: "High Latency Mirror",
    quality: "1080p HD",
    badge: "Degraded",
    badgeClass: "badge-hd",
    tag: "Slow CDN / High Latency",
    contentTypes: [CONTENT_TYPES.BOTH],
    supports: { sub: true, dub: false },
    health: SERVER_HEALTH.DEGRADED,
    adQuality: AD_QUALITY.UNKNOWN,
    movie: (id) => `https://vidsrc.to/embed/movie/${id}`,
    tv: (id, s, e) => `https://vidsrc.to/embed/tv/${id}/${s}/${e}`,
  },
];

// ─── Runtime-mutable health state ─────────────────────────────────────────
/**
 * Server health state — runtime-mutable map of { [serverId]: SERVER_HEALTH }.
 */
export const serverHealthState = {};
SERVERS.forEach((s) => {
  serverHealthState[s.id] = s.health;
});

/**
 * Updates the runtime health status for a given server.
 */
export function setServerHealth(serverId, healthStatus) {
  serverHealthState[serverId] = healthStatus;
}

/**
 * Returns the current runtime health of a server.
 */
export function getServerHealth(serverId) {
  return serverHealthState[serverId] ?? SERVER_HEALTH.WORKING;
}

/**
 * Returns the ad quality of a server by id.
 */
export function getServerAdQuality(serverId) {
  const srv = SERVERS.find((s) => s.id === serverId);
  return srv?.adQuality ?? AD_QUALITY.UNKNOWN;
}

/**
 * Returns whether a provider's ad quality is acceptable for auto-selection.
 * EXCESSIVE_ADS providers are NEVER auto-selected; they can still be manually chosen.
 */
export function isAdQualityAcceptable(adQuality) {
  return (
    adQuality === AD_QUALITY.CLEAN ||
    adQuality === AD_QUALITY.LOW_ADS ||
    adQuality === AD_QUALITY.MODERATE_ADS ||
    adQuality === AD_QUALITY.UNKNOWN
  );
}

/**
 * Checks whether a server is considered "playable" based on health alone.
 * Playable states: WORKING, UNVERIFIED, DEGRADED
 * Non-playable states: UNAVAILABLE, OFFLINE
 */
export function isServerPlayable(serverIdOrHealth) {
  if (!serverIdOrHealth) return false;
  const status = Object.values(SERVER_HEALTH).includes(serverIdOrHealth)
    ? serverIdOrHealth
    : getServerHealth(serverIdOrHealth);

  return (
    status === SERVER_HEALTH.WORKING ||
    status === SERVER_HEALTH.UNVERIFIED ||
    status === SERVER_HEALTH.DEGRADED
  );
}

/**
 * Generates a unique key for evaluating title/episode-specific source health.
 */
export function getSourceHealthKey({
  serverId,
  type = "movie",
  id,
  season = 1,
  episode = 1,
  categoryKey = "sub",
}) {
  const baseServerId = (serverId || "srv")
    .replace(/-ssub$|-dub$/, "");
  if (type === "tv") {
    return `${baseServerId}:tv:${id}:s${season}:e${episode}:${categoryKey}`;
  }
  return `${baseServerId}:movie:${id}:${categoryKey}`;
}

/**
 * Returns a filtered list of servers based on:
 *   - contentType: 'anime' | 'movie'
 *   - audioType: 'sub' | 'dub' | null (null = no audio filter)
 *   - allowExcessiveAds: defaults to false — hides EXCESSIVE_ADS providers from auto-selection
 *
 * Only returns servers that support the content and are currently PLAYABLE.
 */
export function getServersForContent(contentType, audioType = null, allowExcessiveAds = false) {
  return SERVERS.filter((srv) => {
    // 1. Content type match
    const typeMatch =
      srv.contentTypes.includes(CONTENT_TYPES.BOTH) ||
      (contentType === "anime" && srv.contentTypes.includes(CONTENT_TYPES.ANIME)) ||
      (contentType === "movie" && srv.contentTypes.includes(CONTENT_TYPES.MOVIE));
    if (!typeMatch) return false;

    // 2. Audio type match
    if (audioType === "sub" && !srv.supports.sub) return false;
    if (audioType === "dub" && !srv.supports.dub) return false;

    // 3. Health & playability check
    if (!isServerPlayable(srv.id)) return false;

    // 4. Ad quality gate — skip EXCESSIVE_ADS providers for auto-selection
    if (!allowExcessiveAds && srv.adQuality === AD_QUALITY.EXCESSIVE_ADS) return false;

    return true;
  });
}

/**
 * Builds a source entry from a server definition for a specific piece of content.
 * Includes adQuality so UI and ranking can use it.
 */
export function buildSourceEntry(srv, { type, id, imdbId, season, episode, subtitles = [] }) {
  const url = type === "tv"
    ? srv.tv(id, season, episode, imdbId)
    : srv.movie(id, imdbId);

  return {
    id: srv.id,
    name: srv.name,
    quality: srv.quality,
    badge: srv.badge,
    badgeClass: srv.badgeClass,
    tag: srv.tag,
    health: getServerHealth(srv.id),
    adQuality: srv.adQuality ?? AD_QUALITY.UNKNOWN,
    recommended: srv.recommended ?? false,
    url,
    subtitles,
  };
}

/**
 * Generates dynamic SUB, S-SUB, DUB categories for any standard TMDB content.
 * Uses server capability (contentTypes + supports) + health filtering.
 * Providers with EXCESSIVE_ADS are excluded from the default pool.
 */
export function generateDynamicCategories({
  contentType,  // 'anime' | 'movie'
  type,         // 'tv' | 'movie' (TMDB type)
  id,
  imdbId,
  season,
  episode,
  subtitles = [],
}) {
  const subServers = getServersForContent(contentType, "sub");
  const dubServers = getServersForContent(contentType, "dub");

  const subSources = subServers.map((srv) =>
    buildSourceEntry(srv, { type, id, imdbId, season, episode, subtitles })
  );

  const dubSources = dubServers.map((srv) =>
    buildSourceEntry(srv, { type, id, imdbId, season, episode })
  );

  // S-SUB uses softsub/clean servers from SUB category
  const ssubSources = subSources.slice(0, 2).map((src) => ({
    ...src,
    id: `${src.id}-ssub`,
    badge: "SoftSub",
    badgeClass: "badge-hd",
  }));

  return {
    sub: subSources.length > 0
      ? { status: "AVAILABLE", sources: subSources }
      : null,
    ssub: ssubSources.length > 0
      ? { status: "AVAILABLE", sources: ssubSources }
      : null,
    dub: dubSources.length > 0
      ? { status: "AVAILABLE", sources: dubSources }
      : null,
  };
}

/**
 * Legacy getEmbedUrl — kept for backward compatibility.
 */
export function getEmbedUrl({
  type,
  id,
  imdbId = null,
  season = 1,
  episode = 1,
  serverIndex = 0,
}) {
  const srv = SERVERS[serverIndex] || SERVERS[0];
  return type === "tv"
    ? srv.tv(id, season, episode, imdbId)
    : srv.movie(id, imdbId);
}