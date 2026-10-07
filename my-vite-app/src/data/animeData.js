/**
 * animeData.js
 * Comprehensive Anime & Movie Release Schedule, Categorized Streaming Sources, and Subtitle Database.
 * Supports SUB, S-SUB, DUB with independent release times, countdowns, and WebVTT subtitle tracks.
 */

import { generateDynamicCategories } from "./sources.js";
import { getCategoryStatus, STATUS_TYPES } from "../utils/releaseUtils.js";

// Sample WebVTT subtitle tracks (supports English, Khmer, Chinese, Japanese, etc.)
export const SAMPLE_SUBTITLES = {
  multilingual: [
    {
      id: "sub-en",
      language: "English",
      languageCode: "en",
      label: "English [CC]",
      url: "https://raw.githubusercontent.com/brenopolanski/html5-video-webvtt-example/master/subtitles/subtitles-en.vtt",
    },
    {
      id: "sub-km",
      language: "Khmer (ភាសាខ្មែរ)",
      languageCode: "km",
      label: "Khmer Hardsub/Softsub",
      url: "https://raw.githubusercontent.com/brenopolanski/html5-video-webvtt-example/master/subtitles/subtitles-en.vtt", // WebVTT endpoint
    },
    {
      id: "sub-zh",
      language: "Chinese (中文)",
      languageCode: "zh",
      label: "Mandarin Simplified",
      url: "https://raw.githubusercontent.com/brenopolanski/html5-video-webvtt-example/master/subtitles/subtitles-en.vtt",
    },
    {
      id: "sub-ja",
      language: "Japanese (日本語)",
      languageCode: "ja",
      label: "Japanese Audio Track Subs",
      url: "https://raw.githubusercontent.com/brenopolanski/html5-video-webvtt-example/master/subtitles/subtitles-en.vtt",
    },
  ],
  standard: [
    {
      id: "sub-en-std",
      language: "English",
      languageCode: "en",
      label: "English (US)",
      url: "https://raw.githubusercontent.com/brenopolanski/html5-video-webvtt-example/master/subtitles/subtitles-en.vtt",
    },
    {
      id: "sub-km-std",
      language: "Khmer",
      languageCode: "km",
      label: "Khmer Translation",
      url: "https://raw.githubusercontent.com/brenopolanski/html5-video-webvtt-example/master/subtitles/subtitles-en.vtt",
    },
  ],
};

// Relative helper timestamps for realistic testing:
const now = Date.now();
const inOneHour = new Date(now + 60 * 60 * 1000).toISOString();
const inTomorrow = new Date(now + 24 * 60 * 60 * 1000).toISOString();
const inThreeDays = new Date(now + 3 * 24 * 60 * 60 * 1000).toISOString();
const inSevenDays = new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString();
const pastDate = new Date(now - 14 * 24 * 60 * 60 * 1000).toISOString();

/**
 * Custom Media Release Database
 * Keyed by TMDB ID, Anime ID, or custom slug.
 */
export const CUSTOM_MEDIA_DATABASE = {
  // ── Solo Leveling (TMDB TV ID: 82452 / anime slug: "solo-leveling") ──
  "82452": {
    id: "82452",
    slug: "solo-leveling",
    title: "Solo Leveling (Ore dake Level Up na Ken)",
    type: "tv",
    contentType: "anime",
    posterPath: "https://image.tmdb.org/t/p/w342/geCRueV3ElhRTr0xtJuClJ7xtOD.jpg",
    seasons: {
      1: {
        episodes: [
          // Scenario 1: Already released episode (SUB + DUB available, multi-server)
          {
            number: 1,
            title: "I'm Used to It",
            overview: "Known as the Weakest Hunter of All Mankind, Sung Jinwoo struggles to survive in low-rank dungeons.",
            rating: 8.9,
            sub: {
              status: STATUS_TYPES.AVAILABLE,
              releaseAt: pastDate,
              sources: [
                {
                  id: "vidsrcto",
                  name: "Server 1 · VidSrc TO",
                  quality: "1080p Full HD",
                  badge: "1080p HD",
                  badgeClass: "badge-fhd",
                  url: "https://vidsrc.to/embed/tv/82452/1/1",
                  subtitles: SAMPLE_SUBTITLES.multilingual,
                },
                {
                  id: "autoembed",
                  name: "Server 2 · AutoEmbed",
                  quality: "1080p HD",
                  badge: "Fast Edge",
                  badgeClass: "badge-hd",
                  url: "https://player.autoembed.cc/embed/tv/82452/1/1",
                  subtitles: SAMPLE_SUBTITLES.multilingual,
                },
              ],
            },
            ssub: {
              status: STATUS_TYPES.AVAILABLE,
              releaseAt: pastDate,
              sources: [
                {
                  id: "embedsu",
                  name: "Server 1 · EmbedSu Soft-Sub",
                  quality: "1080p HD",
                  badge: "SoftSub HD",
                  badgeClass: "badge-hd",
                  url: "https://embed.su/embed/tv/82452/1/1",
                  subtitles: SAMPLE_SUBTITLES.multilingual,
                },
              ],
            },
            dub: {
              status: STATUS_TYPES.AVAILABLE,
              releaseAt: pastDate,
              sources: [
                {
                  id: "vidsrcme-dub",
                  name: "Server 1 · VidSrc English Dub",
                  quality: "1080p Full HD",
                  badge: "English DUB",
                  badgeClass: "badge-fhd",
                  url: "https://vidsrc.me/embed/tv?tmdb=82452&season=1&episode=1",
                },
              ],
            },
          },

          // Scenario 4: SUB available but DUB upcoming in 3 days
          {
            number: 2,
            title: "If I Had One More Chance",
            overview: "Jinwoo discovers a hidden quest inside the double dungeon that changes his destiny forever.",
            rating: 9.1,
            sub: {
              status: STATUS_TYPES.AVAILABLE,
              releaseAt: pastDate,
              sources: [
                {
                  id: "vidsrcto",
                  name: "Server 1 · VidSrc TO",
                  quality: "1080p Full HD",
                  badge: "1080p HD",
                  badgeClass: "badge-fhd",
                  url: "https://vidsrc.to/embed/tv/82452/1/2",
                  subtitles: SAMPLE_SUBTITLES.multilingual,
                },
              ],
            },
            ssub: {
              status: STATUS_TYPES.AVAILABLE,
              releaseAt: pastDate,
              sources: [
                {
                  id: "embedsu",
                  name: "Server 1 · EmbedSu Soft-Sub",
                  quality: "1080p HD",
                  badge: "SoftSub",
                  badgeClass: "badge-hd",
                  url: "https://embed.su/embed/tv/82452/1/2",
                  subtitles: SAMPLE_SUBTITLES.multilingual,
                },
              ],
            },
            dub: {
              status: STATUS_TYPES.UPCOMING,
              releaseAt: inThreeDays,
              sources: [
                {
                  id: "vidsrcme-dub",
                  name: "Server 1 · VidSrc English Dub",
                  quality: "1080p Full HD",
                  badge: "English DUB",
                  badgeClass: "badge-fhd",
                  url: "https://vidsrc.me/embed/tv?tmdb=82452&season=1&episode=2",
                },
              ],
            },
          },

          // Scenario 2: Episode releasing in 1 hour (Live Countdown!)
          {
            number: 3,
            title: "It's Like a Game",
            overview: "Jinwoo awakens in the hospital with a holographic quest log that only he can see.",
            rating: 8.8,
            sub: {
              status: STATUS_TYPES.UPCOMING,
              releaseAt: inOneHour,
              sources: [
                {
                  id: "vidsrcto",
                  name: "Server 1 · VidSrc TO",
                  quality: "1080p Full HD",
                  badge: "1080p HD",
                  badgeClass: "badge-fhd",
                  url: "https://vidsrc.to/embed/tv/82452/1/3",
                  subtitles: SAMPLE_SUBTITLES.multilingual,
                },
              ],
            },
            dub: {
              status: STATUS_TYPES.UPCOMING,
              releaseAt: inSevenDays,
              sources: [
                {
                  id: "vidsrcme-dub",
                  name: "Server 1 · VidSrc English Dub",
                  quality: "1080p Full HD",
                  badge: "English DUB",
                  badgeClass: "badge-fhd",
                  url: "https://vidsrc.me/embed/tv?tmdb=82452&season=1&episode=3",
                },
              ],
            },
          },

          // Scenario 3: Episode releasing tomorrow (Countdown ticking)
          {
            number: 4,
            title: "I've Gotta Get Stronger",
            overview: "Jinwoo enters an instant dungeon to test his newly acquired hunter stats and dagger skills.",
            rating: 9.0,
            sub: {
              status: STATUS_TYPES.UPCOMING,
              releaseAt: inTomorrow,
              sources: [
                {
                  id: "vidsrcto",
                  name: "Server 1 · VidSrc TO",
                  quality: "1080p Full HD",
                  badge: "1080p HD",
                  badgeClass: "badge-fhd",
                  url: "https://vidsrc.to/embed/tv/82452/1/4",
                  subtitles: SAMPLE_SUBTITLES.multilingual,
                },
              ],
            },
            dub: {
              status: STATUS_TYPES.UPCOMING,
              releaseAt: inSevenDays,
              sources: [],
            },
          },

          // Scenario 8: Episode with NO DUB (only SUB and S-SUB)
          {
            number: 5,
            title: "A Pretty Good Deal",
            overview: "Jinwoo joins a strike squad as a porter, not knowing the dangers that lie ahead.",
            rating: 9.2,
            sub: {
              status: STATUS_TYPES.AVAILABLE,
              releaseAt: pastDate,
              sources: [
                {
                  id: "vidsrcto",
                  name: "Server 1 · VidSrc TO",
                  quality: "1080p Full HD",
                  badge: "1080p HD",
                  badgeClass: "badge-fhd",
                  url: "https://vidsrc.to/embed/tv/82452/1/5",
                  subtitles: SAMPLE_SUBTITLES.multilingual,
                },
                {
                  id: "autoembed",
                  name: "Server 2 · AutoEmbed",
                  quality: "1080p HD",
                  badge: "Fast Edge",
                  badgeClass: "badge-hd",
                  url: "https://player.autoembed.cc/embed/tv/82452/1/5",
                  subtitles: SAMPLE_SUBTITLES.multilingual,
                },
              ],
            },
            ssub: {
              status: STATUS_TYPES.AVAILABLE,
              releaseAt: pastDate,
              sources: [
                {
                  id: "embedsu",
                  name: "Server 1 · EmbedSu Soft-Sub",
                  quality: "1080p HD",
                  badge: "SoftSub",
                  badgeClass: "badge-hd",
                  url: "https://embed.su/embed/tv/82452/1/5",
                  subtitles: SAMPLE_SUBTITLES.multilingual,
                },
              ],
            },
            // Note: NO DUB property here!
          },

          // Scenario 9: Episode with NO S-SUB (only SUB and DUB)
          {
            number: 6,
            title: "The Real Hunt Begins",
            overview: "Betrayal in the C-Rank dungeon forces Jinwoo to make a fateful decision.",
            rating: 9.4,
            sub: {
              status: STATUS_TYPES.AVAILABLE,
              releaseAt: pastDate,
              sources: [
                {
                  id: "vidsrcto",
                  name: "Server 1 · VidSrc TO",
                  quality: "1080p Full HD",
                  badge: "1080p HD",
                  badgeClass: "badge-fhd",
                  url: "https://vidsrc.to/embed/tv/82452/1/6",
                  subtitles: SAMPLE_SUBTITLES.standard,
                },
              ],
            },
            dub: {
              status: STATUS_TYPES.AVAILABLE,
              releaseAt: pastDate,
              sources: [
                {
                  id: "vidsrcme-dub",
                  name: "Server 1 · VidSrc English Dub",
                  quality: "1080p Full HD",
                  badge: "English DUB",
                  badgeClass: "badge-fhd",
                  url: "https://vidsrc.me/embed/tv?tmdb=82452&season=1&episode=6",
                },
              ],
            },
            // Note: NO S-SUB property here!
          },

          // Scenario: Delayed release
          {
            number: 7,
            title: "Let's See How Far I Can Go",
            overview: "Special training episode with advanced skill tree unlock.",
            rating: 8.7,
            sub: {
              status: STATUS_TYPES.DELAYED,
              releaseAt: inThreeDays,
              sources: [],
            },
          },

          // Scenario: Cancelled release
          {
            number: 8,
            title: "Recap Special Episode",
            overview: "Broadcast recap episode.",
            rating: 7.0,
            sub: {
              status: STATUS_TYPES.CANCELLED,
              sources: [],
            },
          },
        ],
      },
    },
  },

  // ── Jujutsu Kaisen (TMDB TV ID: 95479 / slug: "jujutsu-kaisen") ──
  "95479": {
    id: "95479",
    slug: "jujutsu-kaisen",
    title: "Jujutsu Kaisen",
    type: "tv",
    posterPath: "https://image.tmdb.org/t/p/w342/fHpKWKq5jzbovG8f0vY1A39bLrq.jpg",
    seasons: {
      1: {
        episodes: [
          // Scenario 10: Episode with MULTIPLE streaming servers per category (failover mirrors)
          {
            number: 1,
            title: "Ryomen Sukuna",
            overview: "Yuji Itadori swallows a cursed finger talisman to save his friends.",
            rating: 9.3,
            sub: {
              status: STATUS_TYPES.AVAILABLE,
              releaseAt: pastDate,
              sources: [
                {
                  id: "vidsrcto",
                  name: "Server 1 · VidSrc TO (Primary)",
                  quality: "1080p Full HD",
                  badge: "1080p HD",
                  badgeClass: "badge-fhd",
                  url: "https://vidsrc.to/embed/tv/95479/1/1",
                  subtitles: SAMPLE_SUBTITLES.multilingual,
                },
                {
                  id: "autoembed",
                  name: "Server 2 · AutoEmbed Edge CDN",
                  quality: "1080p HD",
                  badge: "Fast Edge",
                  badgeClass: "badge-hd",
                  url: "https://player.autoembed.cc/embed/tv/95479/1/1",
                  subtitles: SAMPLE_SUBTITLES.multilingual,
                },
                {
                  id: "superembed",
                  name: "Server 3 · Cinezo Super Multi",
                  quality: "1080p HD",
                  badge: "Multi-Mirror",
                  badgeClass: "badge-multi",
                  url: "https://multiembed.mov/?video_id=95479&tmdb=1&s=1&e=1",
                  subtitles: SAMPLE_SUBTITLES.multilingual,
                },
              ],
            },
            ssub: {
              status: STATUS_TYPES.AVAILABLE,
              releaseAt: pastDate,
              sources: [
                {
                  id: "embedsu",
                  name: "Server 1 · EmbedSu Soft-Sub",
                  quality: "1080p HD",
                  badge: "SoftSub",
                  badgeClass: "badge-hd",
                  url: "https://embed.su/embed/tv/95479/1/1",
                  subtitles: SAMPLE_SUBTITLES.multilingual,
                },
                {
                  id: "videasy",
                  name: "Server 2 · Videasy Clean Player",
                  quality: "1080p HD",
                  badge: "Clean HD",
                  badgeClass: "badge-hd",
                  url: "https://player.videasy.net/tv/95479/1/1",
                  subtitles: SAMPLE_SUBTITLES.multilingual,
                },
              ],
            },
            dub: {
              status: STATUS_TYPES.AVAILABLE,
              releaseAt: pastDate,
              sources: [
                {
                  id: "vidsrcme-dub",
                  name: "Server 1 · VidSrc English Dub",
                  quality: "1080p Full HD",
                  badge: "English DUB",
                  badgeClass: "badge-fhd",
                  url: "https://vidsrc.me/embed/tv?tmdb=95479&season=1&episode=1",
                },
              ],
            },
          },
        ],
      },
    },
  },

  // ── Scenario 7: Movie Already Released (SUB, S-SUB, DUB all available with subtitles) ──
  // Suzume (TMDB Movie ID: 937278)
  "937278": {
    id: "937278",
    slug: "suzume",
    title: "Suzume no Tojimari",
    type: "movie",
    posterPath: "https://image.tmdb.org/t/p/w342/vIeu8WysZrTSm2FdbtFLxLliF61.jpg",
    sub: {
      status: STATUS_TYPES.AVAILABLE,
      releaseAt: pastDate,
      sources: [
        {
          id: "vidsrcto",
          name: "Server 1 · VidSrc TO (Primary)",
          quality: "1080p Full HD",
          badge: "1080p HD",
          badgeClass: "badge-fhd",
          url: "https://vidsrc.to/embed/movie/937278",
          subtitles: SAMPLE_SUBTITLES.multilingual,
        },
      ],
    },
    ssub: {
      status: STATUS_TYPES.AVAILABLE,
      releaseAt: pastDate,
      sources: [
        {
          id: "embedsu",
          name: "Server 1 · EmbedSu Soft-Sub",
          quality: "1080p HD",
          badge: "SoftSub",
          badgeClass: "badge-hd",
          url: "https://embed.su/embed/movie/937278",
          subtitles: SAMPLE_SUBTITLES.multilingual,
        },
      ],
    },
    dub: {
      status: STATUS_TYPES.AVAILABLE,
      releaseAt: pastDate,
      sources: [
        {
          id: "vidsrcme-dub",
          name: "Server 1 · VidSrc English Dub",
          quality: "1080p Full HD",
          badge: "English DUB",
          badgeClass: "badge-fhd",
          url: "https://vidsrc.me/embed/movie?tmdb=937278",
        },
      ],
    },
  },

  // ── Scenario 6: Movie Upcoming (Shows countdown & release date, no servers until time) ──
  // Chainsaw Man - The Movie: Reze Arc (custom ID / TMDB placeholder: "chainsaw-man-movie")
  "chainsaw-man-movie": {
    id: "chainsaw-man-movie",
    slug: "chainsaw-man-movie",
    title: "Chainsaw Man – The Movie: Reze Arc",
    type: "movie",
    posterPath: "https://image.tmdb.org/t/p/w342/npdB6eFz4qt9CdISEgLO3LwIER5.jpg",
    sub: {
      status: STATUS_TYPES.UPCOMING,
      releaseAt: inTomorrow,
      sources: [
        {
          id: "vidsrcto",
          name: "Server 1 · VidSrc TO",
          quality: "1080p Full HD",
          badge: "1080p HD",
          badgeClass: "badge-fhd",
          url: "https://vidsrc.to/embed/movie/chainsaw-man-movie",
          subtitles: SAMPLE_SUBTITLES.multilingual,
        },
      ],
    },
    dub: {
      status: STATUS_TYPES.UPCOMING,
      releaseAt: inSevenDays,
      sources: [],
    },
  },

  // ── Movie with SUB available and DUB upcoming in 2 days ──
  // Deadpool & Wolverine (TMDB Movie ID: 533535)
  "533535": {
    id: "533535",
    slug: "deadpool-and-wolverine",
    title: "Deadpool & Wolverine",
    type: "movie",
    posterPath: "https://image.tmdb.org/t/p/w342/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg",
    sub: {
      status: STATUS_TYPES.AVAILABLE,
      releaseAt: pastDate,
      sources: [
        {
          id: "vidsrcto",
          name: "Server 1 · VidSrc TO (Cinema)",
          quality: "1080p Full HD",
          badge: "1080p HD",
          badgeClass: "badge-fhd",
          url: "https://vidsrc.to/embed/movie/533535",
          subtitles: SAMPLE_SUBTITLES.standard,
        },
      ],
    },
    dub: {
      status: STATUS_TYPES.UPCOMING,
      releaseAt: inThreeDays,
      sources: [
        {
          id: "vidsrcme-dub",
          name: "Server 1 · International Dub Mirror",
          quality: "1080p Full HD",
          badge: "DUB Mirror",
          badgeClass: "badge-fhd",
          url: "https://vidsrc.me/embed/movie?tmdb=533535",
        },
      ],
    },
  },
};

/**
 * Resolves media release data for ANY media item (Custom Anime / Movie or standard TMDB item).
 * Generates structured SUB, S-SUB, DUB categories seamlessly.
 */
export function getMediaReleaseData({
  type = "movie",
  id,
  season = 1,
  episode = 1,
  imdbId = null,
}) {
  const mediaKey = String(id);
  const customMedia = CUSTOM_MEDIA_DATABASE[mediaKey];

  if (customMedia) {
    if (type === "tv") {
      const seasonConfig = customMedia.seasons?.[season];
      const episodeConfig = seasonConfig?.episodes?.find(
        (ep) => ep.number === Number(episode)
      );

      if (episodeConfig) {
        // Return validated episode category configuration
        return {
          isCustom: true,
          episodeNumber: episodeConfig.number,
          title: episodeConfig.title,
          overview: episodeConfig.overview,
          rating: episodeConfig.rating,
          sub: episodeConfig.sub ? validateCategoryConfig(episodeConfig.sub) : null,
          ssub: episodeConfig.ssub ? validateCategoryConfig(episodeConfig.ssub) : null,
          dub: episodeConfig.dub ? validateCategoryConfig(episodeConfig.dub) : null,
        };
      }
    } else {
      // Movie custom configuration
      return {
        isCustom: true,
        title: customMedia.title,
        sub: customMedia.sub ? validateCategoryConfig(customMedia.sub) : null,
        ssub: customMedia.ssub ? validateCategoryConfig(customMedia.ssub) : null,
        dub: customMedia.dub ? validateCategoryConfig(customMedia.dub) : null,
      };
    }
  }

  // Fallback: dynamically generate categorized streaming configuration using
  // server capability (contentType + audio support) + health filtering.
  // TV shows default to 'anime' server pool; movies use movie pool.
  const autoContentType = type === "tv" ? "anime" : "movie";
  return generateDefaultCategoriesFromServers({
    type,
    id,
    season,
    episode,
    imdbId,
    contentType: autoContentType,
  });
}

/**
 * Validates a category configuration to ensure safe rendering without crashes.
 */
function validateCategoryConfig(cat) {
  if (!cat) return null;
  const status = getCategoryStatus(cat);
  return {
    status,
    releaseAt: cat.releaseAt || null,
    sources: Array.isArray(cat.sources)
      ? cat.sources.map((s, idx) => ({
          id: s.id || `srv-${idx}`,
          name: s.name || `Server ${idx + 1}`,
          quality: s.quality || "1080p Full HD",
          badge: s.badge || "1080p HD",
          badgeClass: s.badgeClass || "badge-fhd",
          url: s.url || "",
          subtitles: Array.isArray(s.subtitles) ? s.subtitles : [],
        }))
      : [],
  };
}

/**
 * Generates dynamic SUB, S-SUB, DUB categories using server capability metadata.
 * Delegates to generateDynamicCategories() which filters by contentType, audio support,
 * and current health state. Standard TMDB content is treated as 'movie' by default;
 * TV anime content is detected by whether TMDB type is 'tv'.
 */
function generateDefaultCategoriesFromServers({
  type,
  id,
  season,
  episode,
  imdbId,
  contentType,
}) {
  // Determine content classification:
  // Known anime IDs in CUSTOM_MEDIA_DATABASE are tagged; for generic TMDB content
  // we treat TV as potential anime (broader server pool) and movies as movie-type.
  const resolvedContentType = contentType ||
    (type === "tv" ? "anime" : "movie");

  const categories = generateDynamicCategories({
    contentType: resolvedContentType,
    type,
    id,
    imdbId,
    season,
    episode,
    subtitles: SAMPLE_SUBTITLES.standard,
  });

  return {
    isCustom: false,
    contentType: resolvedContentType,
    ...categories,
  };
}

// ── Admin / Data Management API functions ──

/**
 * Add or update a custom Anime series configuration.
 */
export function addCustomAnime(animeConfig) {
  if (!animeConfig || !animeConfig.id) return false;
  CUSTOM_MEDIA_DATABASE[String(animeConfig.id)] = {
    type: "tv",
    seasons: {},
    ...animeConfig,
  };
  return true;
}

/**
 * Add or update a custom episode in an anime series.
 */
export function addCustomEpisode(animeId, seasonNumber = 1, episodeConfig) {
  const anime = CUSTOM_MEDIA_DATABASE[String(animeId)];
  if (!anime) return false;
  if (!anime.seasons[seasonNumber]) {
    anime.seasons[seasonNumber] = { episodes: [] };
  }
  const existingIdx = anime.seasons[seasonNumber].episodes.findIndex(
    (ep) => ep.number === episodeConfig.number
  );
  if (existingIdx >= 0) {
    anime.seasons[seasonNumber].episodes[existingIdx] = episodeConfig;
  } else {
    anime.seasons[seasonNumber].episodes.push(episodeConfig);
  }
  return true;
}

/**
 * Add or update a custom movie release configuration.
 */
export function addCustomMovie(movieConfig) {
  if (!movieConfig || !movieConfig.id) return false;
  CUSTOM_MEDIA_DATABASE[String(movieConfig.id)] = {
    type: "movie",
    ...movieConfig,
  };
  return true;
}
