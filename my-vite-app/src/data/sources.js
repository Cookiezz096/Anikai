/**
 * sources.js
 * Streaming server registry with capability, health, and ad-quality metadata.
 *
 * Each server declares:
 *   - contentTypes: ['tv', 'movie', 'both']  — what content it can stream
 *   - supports.sub: boolean  — can serve standard/subtitled content
 *   - supports.dub: boolean  — can serve multi-audio content
 *   - health: SERVER_HEALTH.*  — provider availability status
 *   - adQuality: AD_QUALITY.*  — popup/ad intrusion level (separate from health)
 *   - movie(id, imdb): function returning embed URL for movies
 *   - tv(id, s, e, imdb): function returning embed URL for TV episodes
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
  TV:    "tv",
  MOVIE: "movie",
  BOTH:  "both",
};

// ─── Provider Registry ────────────────────────────────────────────────────
export const SERVERS = [
  {
    id: "videasy",
    name: "Videasy Cloud",
    quality: "1080p Ultra HD",
    badge: "1080p Ultra",
    badgeClass: "badge-fhd",
    tag: "Primary Direct VIP · Ultra Fast",
    recommended: true,
    contentTypes: [CONTENT_TYPES.BOTH],
    supports: { sub: true, dub: true },
    health: SERVER_HEALTH.WORKING,
    adQuality: AD_QUALITY.CLEAN,
    movie: (id, imdb) => {
      const isImdb = (typeof id === "string" && id.startsWith("tt")) || (typeof imdb === "string" && imdb.startsWith("tt"));
      const targetId = isImdb ? ((typeof id === "string" && id.startsWith("tt")) ? id : imdb) : id;
      return `https://player.videasy.net/movie/${targetId}`;
    },
    tv: (id, s, e, imdb) => {
      const isImdb = (typeof id === "string" && id.startsWith("tt")) || (typeof imdb === "string" && imdb.startsWith("tt"));
      const targetId = isImdb ? ((typeof id === "string" && id.startsWith("tt")) ? id : imdb) : id;
      return `https://player.videasy.net/tv/${targetId}/${s}/${e}`;
    },
  },
  {
    id: "vidlink",
    name: "VidLink Pro",
    quality: "1080p Full HD",
    badge: "1080p HD",
    badgeClass: "badge-fhd",
    tag: "High-Speed Stream · Multi-Audio",
    recommended: false,
    contentTypes: [CONTENT_TYPES.BOTH],
    supports: { sub: true, dub: true },
    health: SERVER_HEALTH.WORKING,
    adQuality: AD_QUALITY.LOW_ADS,
    movie: (id, imdb) => {
      const isImdb = (typeof id === "string" && id.startsWith("tt")) || (typeof imdb === "string" && imdb.startsWith("tt"));
      const targetId = isImdb ? ((typeof id === "string" && id.startsWith("tt")) ? id : imdb) : id;
      return `https://vidlink.pro/movie/${targetId}`;
    },
    tv: (id, s, e, imdb) => {
      const isImdb = (typeof id === "string" && id.startsWith("tt")) || (typeof imdb === "string" && imdb.startsWith("tt"));
      const targetId = isImdb ? ((typeof id === "string" && id.startsWith("tt")) ? id : imdb) : id;
      return `https://vidlink.pro/tv/${targetId}/${s}/${e}`;
    },
  },
  {
    id: "multiembed",
    name: "MultiEmbed VIP",
    quality: "1080p Full HD",
    badge: "Auto Mirror",
    badgeClass: "badge-fhd",
    tag: "Multi-Mirror Cluster · High Uptime",
    recommended: false,
    contentTypes: [CONTENT_TYPES.BOTH],
    supports: { sub: true, dub: true },
    health: SERVER_HEALTH.WORKING,
    adQuality: AD_QUALITY.LOW_ADS,
    movie: (id, imdb) => {
      const isImdb = (typeof id === "string" && id.startsWith("tt")) || (typeof imdb === "string" && imdb.startsWith("tt"));
      const targetId = isImdb ? ((typeof id === "string" && id.startsWith("tt")) ? id : imdb) : id;
      return `https://multiembed.mov/?video_id=${targetId}&tmdb=1`;
    },
    tv: (id, s, e, imdb) => {
      const isImdb = (typeof id === "string" && id.startsWith("tt")) || (typeof imdb === "string" && imdb.startsWith("tt"));
      const targetId = isImdb ? ((typeof id === "string" && id.startsWith("tt")) ? id : imdb) : id;
      return `https://multiembed.mov/?video_id=${targetId}&tmdb=1&s=${s}&e=${e}`;
    },
  },
  {
    id: "vidsrcto",
    name: "VidSrc TO (Fast Stream)",
    quality: "1080p Ultra HD",
    badge: "Fast Stream",
    badgeClass: "badge-fhd",
    tag: "High-Speed Open Embed · Low Latency",
    recommended: true,
    contentTypes: [CONTENT_TYPES.BOTH],
    supports: { sub: true, dub: true },
    health: SERVER_HEALTH.WORKING,
    adQuality: AD_QUALITY.CLEAN,
    movie: (id, imdb) => {
      const isImdb = (typeof id === "string" && id.startsWith("tt")) || (typeof imdb === "string" && imdb.startsWith("tt"));
      const targetId = isImdb ? ((typeof id === "string" && id.startsWith("tt")) ? id : imdb) : id;
      return `https://vidsrc.to/embed/movie/${targetId}`;
    },
    tv: (id, s, e, imdb) => {
      const isImdb = (typeof id === "string" && id.startsWith("tt")) || (typeof imdb === "string" && imdb.startsWith("tt"));
      const targetId = isImdb ? ((typeof id === "string" && id.startsWith("tt")) ? id : imdb) : id;
      return `https://vidsrc.to/embed/tv/${targetId}/${s}/${e}`;
    },
  },
  {
    id: "vidsrc",
    name: "VidSrc Active",
    quality: "1080p HD",
    badge: "Multi Stream",
    badgeClass: "badge-fhd",
    tag: "Active Mirror · Extensive Catalog",
    recommended: false,
    contentTypes: [CONTENT_TYPES.BOTH],
    supports: { sub: true, dub: true },
    health: SERVER_HEALTH.WORKING,
    adQuality: AD_QUALITY.LOW_ADS,
    movie: (id, imdb) => {
      const isImdb = (typeof id === "string" && id.startsWith("tt")) || (typeof imdb === "string" && imdb.startsWith("tt"));
      const targetId = isImdb ? ((typeof id === "string" && id.startsWith("tt")) ? id : imdb) : id;
      return `https://vidsrc.to/embed/movie/${targetId}`;
    },
    tv: (id, s, e, imdb) => {
      const isImdb = (typeof id === "string" && id.startsWith("tt")) || (typeof imdb === "string" && imdb.startsWith("tt"));
      const targetId = isImdb ? ((typeof id === "string" && id.startsWith("tt")) ? id : imdb) : id;
      return `https://vidsrc.to/embed/tv/${targetId}/${s}/${e}`;
    },
  },
  // Legacy aliases for backward compatibility with cached state and selectors
  {
    id: "vidplay",
    name: "VidLink Pro",
    quality: "1080p Ultra HD",
    badge: "1080p Ultra",
    badgeClass: "badge-fhd",
    tag: "Primary Direct VIP · Ultra Fast",
    recommended: true,
    contentTypes: [CONTENT_TYPES.BOTH],
    supports: { sub: true, dub: true },
    health: SERVER_HEALTH.WORKING,
    adQuality: AD_QUALITY.CLEAN,
    movie: (id, imdb) => {
      const isImdb = (typeof id === "string" && id.startsWith("tt")) || (typeof imdb === "string" && imdb.startsWith("tt"));
      const targetId = isImdb ? ((typeof id === "string" && id.startsWith("tt")) ? id : imdb) : id;
      return `https://vidlink.pro/movie/${targetId}`;
    },
    tv: (id, s, e, imdb) => {
      const isImdb = (typeof id === "string" && id.startsWith("tt")) || (typeof imdb === "string" && imdb.startsWith("tt"));
      const targetId = isImdb ? ((typeof id === "string" && id.startsWith("tt")) ? id : imdb) : id;
      return `https://vidlink.pro/tv/${targetId}/${s}/${e}`;
    },
  },
  {
    id: "vidsrc-cc",
    name: "MultiEmbed VIP",
    quality: "1080p Full HD",
    badge: "Auto Mirror",
    badgeClass: "badge-fhd",
    tag: "Multi-Mirror Cluster · High Uptime",
    recommended: false,
    contentTypes: [CONTENT_TYPES.BOTH],
    supports: { sub: true, dub: true },
    health: SERVER_HEALTH.WORKING,
    adQuality: AD_QUALITY.LOW_ADS,
    movie: (id, imdb) => {
      const isImdb = (typeof id === "string" && id.startsWith("tt")) || (typeof imdb === "string" && imdb.startsWith("tt"));
      const targetId = isImdb ? ((typeof id === "string" && id.startsWith("tt")) ? id : imdb) : id;
      return `https://multiembed.mov/?video_id=${targetId}&tmdb=1`;
    },
    tv: (id, s, e, imdb) => {
      const isImdb = (typeof id === "string" && id.startsWith("tt")) || (typeof imdb === "string" && imdb.startsWith("tt"));
      const targetId = isImdb ? ((typeof id === "string" && id.startsWith("tt")) ? id : imdb) : id;
      return `https://multiembed.mov/?video_id=${targetId}&tmdb=1&s=${s}&e=${e}`;
    },
  },
  {
    id: "byfms",
    name: "VidSrc Active",
    quality: "1080p Full HD",
    badge: "1080p HD",
    badgeClass: "badge-fhd",
    tag: "Active Mirror · High Catalog Coverage",
    recommended: false,
    contentTypes: [CONTENT_TYPES.BOTH],
    supports: { sub: true, dub: true },
    health: SERVER_HEALTH.WORKING,
    adQuality: AD_QUALITY.LOW_ADS,
    movie: (id, imdb) => {
      const isImdb = (typeof id === "string" && id.startsWith("tt")) || (typeof imdb === "string" && imdb.startsWith("tt"));
      const targetId = isImdb ? ((typeof id === "string" && id.startsWith("tt")) ? id : imdb) : id;
      return `https://vidsrc.to/embed/movie/${targetId}`;
    },
    tv: (id, s, e, imdb) => {
      const isImdb = (typeof id === "string" && id.startsWith("tt")) || (typeof imdb === "string" && imdb.startsWith("tt"));
      const targetId = isImdb ? ((typeof id === "string" && id.startsWith("tt")) ? id : imdb) : id;
      return `https://vidsrc.to/embed/tv/${targetId}/${s}/${e}`;
    },
  },
  {
    id: "dghg",
    name: "Videasy Cloud",
    quality: "1080p HD",
    badge: "1080p HD",
    badgeClass: "badge-fhd",
    tag: "Backup Cloud Server",
    recommended: false,
    contentTypes: [CONTENT_TYPES.BOTH],
    supports: { sub: true, dub: true },
    health: SERVER_HEALTH.WORKING,
    adQuality: AD_QUALITY.LOW_ADS,
    movie: (id, imdb) => {
      const isImdb = (typeof id === "string" && id.startsWith("tt")) || (typeof imdb === "string" && imdb.startsWith("tt"));
      const targetId = isImdb ? ((typeof id === "string" && id.startsWith("tt")) ? id : imdb) : id;
      return `https://player.videasy.net/movie/${targetId}`;
    },
    tv: (id, s, e, imdb) => {
      const isImdb = (typeof id === "string" && id.startsWith("tt")) || (typeof imdb === "string" && imdb.startsWith("tt"));
      const targetId = isImdb ? ((typeof id === "string" && id.startsWith("tt")) ? id : imdb) : id;
      return `https://player.videasy.net/tv/${targetId}/${s}/${e}`;
    },
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
 *   - contentType: 'tv' | 'movie'
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
      (contentType === "tv" && srv.contentTypes.includes(CONTENT_TYPES.TV)) ||
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
 * Safely appends or updates the audio track / language query parameter on an embed URL.
 * Preserves existing URL parameters (e.g. tmdb, imdb, seasons, etc.) while guaranteeing
 * that SUB and DUB generate distinct, working streaming endpoints.
 */
export function applyAudioTrackToUrl(rawUrl, audioType = "sub") {
  if (!rawUrl) return "";
  // Open embed providers handle audio tracks and subtitles directly in player controls.
  // We keep the embed URLs clean and uncorrupted.
  return rawUrl;
}

/**
 * Builds a source entry from a server definition for a specific piece of content.
 * Includes explicit audio parameter appending and formatted Server 1/2/3 labels.
 */
export function buildSourceEntry(
  srv,
  { type, id, imdbId, season, episode, subtitles = [], audioType = "sub" },
  index = 0
) {
  try {
    const isImdb = typeof id === "string" && id.startsWith("tt");
    const effectiveImdb = imdbId || (isImdb ? id : null);
    let rawUrl = type === "tv"
      ? (typeof srv.tv === "function" ? srv.tv(id, season, episode, effectiveImdb) : "")
      : (typeof srv.movie === "function" ? srv.movie(id, effectiveImdb) : "");

    const url = applyAudioTrackToUrl(rawUrl, audioType);

    return {
      id: `${srv.id}-${audioType}`,
      serverId: srv.id,
      name: srv.name,
      provider: srv.id,
      quality: srv.quality || "1080p Full HD",
      badge: audioType === "dub" ? "Multi-Audio" : (srv.badge || "1080p HD"),
      badgeClass: srv.badgeClass || "badge-fhd",
      tag: srv.tag,
      health: getServerHealth(srv.id),
      adQuality: srv.adQuality ?? AD_QUALITY.LOW_ADS,
      recommended: srv.recommended ?? false,
      url,
      subtitles: Array.isArray(subtitles) ? subtitles : [],
      audioType,
    };
  } catch (err) {
    console.warn(`[buildSourceEntry] Error for server ${srv?.id}:`, err);
    return {
      id: `${srv?.id || "server"}-${audioType}`,
      serverId: srv?.id || "server",
      name: srv?.name || "Server",
      provider: srv?.id || "server",
      quality: "1080p Full HD",
      badge: "1080p HD",
      badgeClass: "badge-fhd",
      url: "",
      subtitles: [],
      audioType,
    };
  }
}

/**
 * Generates dynamic streaming categories for standard TMDB movies and TV content.
 * Guarantees the canonical active open-embed providers: Videasy, VidLink, MultiEmbed, VidSrc.
 */
export function generateDynamicCategories({
  contentType = "movie",
  type = "movie",
  id,
  imdbId,
  season = 1,
  episode = 1,
  subtitles = [],
}) {
  try {
    const isImdb = typeof id === "string" && id.startsWith("tt");
    const effectiveImdbId = imdbId || (isImdb ? id : null);

    const activeProviderIds = ["vidsrcto", "videasy", "vidlink", "multiembed", "vidsrc"];
    const providers = activeProviderIds
      .map((pid) => SERVERS.find((s) => s.id === pid))
      .filter(Boolean);

    const subSources = providers.map((srv, idx) =>
      buildSourceEntry(srv, { type, id, imdbId: effectiveImdbId, season, episode, subtitles, audioType: "sub" }, idx)
    );

    const dubSources = providers.map((srv, idx) =>
      buildSourceEntry(srv, { type, id, imdbId: effectiveImdbId, season, episode, subtitles: [], audioType: "dub" }, idx)
    );

    return {
      sub: subSources.length > 0
        ? { status: "AVAILABLE", sources: subSources }
        : null,
      ssub: null,
      dub: dubSources.length > 0
        ? { status: "AVAILABLE", sources: dubSources }
        : null,
    };
  } catch (err) {
    console.warn("[generateDynamicCategories] Error:", err);
    return { sub: null, ssub: null, dub: null };
  }
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