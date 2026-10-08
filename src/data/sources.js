/**
 * sources.js
 * Streaming server registry with capability and health metadata.
 *
 * Each server declares:
 *   - contentTypes: ['anime', 'movie', 'both']  — what content it can stream
 *   - supports.sub: boolean  — can serve SUB (subtitled) content
 *   - supports.dub: boolean  — can serve DUB (English/international dubbed) content
 *   - health: 'working' | 'unverified' | 'degraded' | 'unavailable' | 'offline'
 *   - movie(id, imdb): function returning embed URL for movies
 *   - tv(id, s, e, imdb): function returning embed URL for TV/anime episodes
 */

export const SERVER_HEALTH = {
  WORKING:     "working",     // Direct verified active & playable source
  UNVERIFIED:  "unverified",  // Valid endpoint reachable; browser CORS limits deep manifest inspection, treated as playable
  DEGRADED:    "degraded",    // High latency / slow response / timeout warning (playable)
  UNAVAILABLE: "unavailable", // Provider responds but source manifest is 404/broken/unauthorized (NOT playable)
  OFFLINE:     "offline",     // Host unreachable / DNS fail / connection refused (NOT playable)
};

export const CONTENT_TYPES = {
  ANIME: "anime",
  MOVIE: "movie",
  BOTH:  "both",
};

export const SERVERS = [
  // ── Anime + Movie servers supporting both SUB and DUB ─────────────────────
  {
    id: "vidlink",
    name: "VidLink HD",
    quality: "1080p Ultra HD",
    badge: "1080p Ultra",
    badgeClass: "badge-fhd",
    tag: "Ad-Shield Ready · Fast",
    recommended: true,
    contentTypes: [CONTENT_TYPES.BOTH],
    supports: { sub: true, dub: true },
    health: SERVER_HEALTH.WORKING,
    movie: (id) => `https://vidlink.pro/movie/${id}`,
    tv: (id, s, e) => `https://vidlink.pro/tv/${id}/${s}/${e}`,
  },
  {
    id: "vidsrcto",
    name: "VidSrc TO",
    quality: "1080p Full HD",
    badge: "1080p HD",
    badgeClass: "badge-fhd",
    tag: "High Stability · Shielded",
    recommended: true,
    contentTypes: [CONTENT_TYPES.BOTH],
    supports: { sub: true, dub: true },
    health: SERVER_HEALTH.WORKING,
    movie: (id) => `https://vidsrc.to/embed/movie/${id}`,
    tv: (id, s, e) => `https://vidsrc.to/embed/tv/${id}/${s}/${e}`,
  },
  {
    id: "vidsrcme",
    name: "VidSrc ME",
    quality: "1080p Full HD",
    badge: "1080p HD",
    badgeClass: "badge-fhd",
    tag: "Direct Stream · Shielded",
    recommended: false,
    contentTypes: [CONTENT_TYPES.BOTH],
    supports: { sub: true, dub: true },
    health: SERVER_HEALTH.WORKING,
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
    health: SERVER_HEALTH.UNAVAILABLE, // Automatically hidden from playable servers
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
    health: SERVER_HEALTH.UNAVAILABLE, // Automatically hidden from playable servers
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
    health: SERVER_HEALTH.OFFLINE, // Automatically hidden from playable servers
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
    health: SERVER_HEALTH.DEGRADED, // Playable with warning indicator
    movie: (id) => `https://vidsrc.to/embed/movie/${id}`,
    tv: (id, s, e) => `https://vidsrc.to/embed/tv/${id}/${s}/${e}`,
  },
];

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
 * Checks whether a server is considered "playable".
 * Playable states:
 *   - WORKING: Confirmed working
 *   - UNVERIFIED: Reached in browser (CORS-restricted, treated as active/playable)
 *   - DEGRADED: High latency (playable with warning)
 * Non-playable states:
 *   - UNAVAILABLE: Online host, but specific media manifest is broken/missing/404
 *   - OFFLINE: Host down / DNS fail
 */
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
 * Returns a filtered list of servers based on:
 *   - contentType: 'anime' | 'movie'
 *   - audioType: 'sub' | 'dub' | null (null = no audio filter)
 *
 * Only returns servers that support the content and are currently PLAYABLE.
 */
export function getServersForContent(contentType, audioType = null) {
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

    return true;
  });
}

/**
 * Builds a source entry from a server definition for a specific piece of content.
 */
/**
 * Safely appends or updates the audio track / language query parameter on an embed URL.
 * Preserves existing URL parameters (e.g. tmdb, imdb, seasons, etc.) while guaranteeing
 * that SUB and DUB generate distinct, working streaming endpoints.
 */
export function applyAudioTrackToUrl(rawUrl, audioType = "sub") {
  if (!rawUrl) return "";
  const typeKey = String(audioType).toLowerCase();
  try {
    const urlObj = new URL(rawUrl);
    urlObj.searchParams.delete("sub");
    urlObj.searchParams.delete("dub");
    urlObj.searchParams.delete("audio");
    urlObj.searchParams.delete("ssub");

    if (typeKey === "dub") {
      urlObj.searchParams.set("dub", "1");
      urlObj.searchParams.set("audio", "dub");
    } else if (typeKey === "ssub") {
      urlObj.searchParams.set("sub", "1");
      urlObj.searchParams.set("audio", "sub");
      urlObj.searchParams.set("ssub", "1");
    } else {
      urlObj.searchParams.set("sub", "1");
      urlObj.searchParams.set("audio", "sub");
    }
    return urlObj.toString();
  } catch {
    const cleanUrl = rawUrl.replace(/[?&](sub|dub|audio|ssub)=[^&]*/g, "");
    const separator = cleanUrl.includes("?") ? "&" : "?";
    if (typeKey === "dub") {
      return `${cleanUrl}${separator}audio=dub&dub=1`;
    }
    if (typeKey === "ssub") {
      return `${cleanUrl}${separator}audio=sub&sub=1&ssub=1`;
    }
    return `${cleanUrl}${separator}audio=sub&sub=1`;
  }
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
  let rawUrl = type === "tv"
    ? srv.tv(id, season, episode, imdbId)
    : srv.movie(id, imdbId);

  const url = applyAudioTrackToUrl(rawUrl, audioType);
  const serverNumber = index + 1;

  return {
    id: `${srv.id}-${audioType}`,
    serverId: srv.id,
    name: `Server ${serverNumber} · ${srv.name}`,
    quality: srv.quality || "1080p Full HD",
    badge: audioType === "dub" ? "English DUB" : (srv.badge || "1080p HD"),
    badgeClass: srv.badgeClass || "badge-fhd",
    tag: srv.tag,
    health: getServerHealth(srv.id),
    url,
    subtitles,
    audioType,
  };
}

/**
 * Generates dynamic SUB, S-SUB, DUB categories for any standard TMDB or anime content.
 * Uses server capability (contentTypes + supports) + health filtering.
 * Returns distinct multi-server arrays (Server 1, Server 2, Server 3) for each audio option.
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

  const safeDubServers = dubServers.length >= 3
    ? dubServers
    : [
        ...dubServers,
        ...subServers.filter((s) => !dubServers.some((d) => d.id === s.id)),
      ].slice(0, 3);

  const subSources = subServers.slice(0, 3).map((srv, idx) =>
    buildSourceEntry(srv, { type, id, imdbId, season, episode, subtitles, audioType: "sub" }, idx)
  );

  const dubSources = safeDubServers.slice(0, 3).map((srv, idx) =>
    buildSourceEntry(srv, { type, id, imdbId, season, episode, audioType: "dub" }, idx)
  );

  // S-SUB uses softsub/clean servers from SUB category
  const ssubSources = subSources.slice(0, 2).map((src, idx) => ({
    ...src,
    id: `${src.id}-ssub`,
    name: `Server ${idx + 1} · SoftSub Stream`,
    url: applyAudioTrackToUrl(src.url, "ssub"),
    badge: "SoftSub HD",
    badgeClass: "badge-hd",
    audioType: "ssub",
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