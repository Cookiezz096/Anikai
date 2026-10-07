/**
 * notificationService.js
 * Universal release notification engine for Anikai.
 * Automatically aggregates:
 * 1. New Episodes (Airing anime & TV series episodes, multi-audio releases)
 * 2. New Releases (Newly added Movies & Anime titles)
 * 3. Upcoming Releases (Scheduled episodes with countdowns, future anime & movie premieres)
 */

import {
  getAiringTodayTV,
  getNowPlayingMovies,
  getUpcomingMovies,
  getTrending,
  getDiscoverAnime,
  tmdbImage,
} from "../lib/tmdb";
import { CUSTOM_MEDIA_DATABASE } from "../data/animeData";
import { getAllWatchProgress } from "./watchHistory";
import { formatLocalDateTime, calculateRemainingTime, STATUS_TYPES } from "./releaseUtils";

const STORAGE_KEYS = {
  READ_NOTIFS: "anikai_read_notifications_v1",
  NOTIF_FILTER: "anikai_notif_filter_v1",
};

// Fallback curated release notifications (offline resilient & instant rendering)
const CURATED_RELEASES = [
  {
    id: "curated_ep_one_piece_1150",
    category: "episode",
    categoryLabel: "New Episode",
    title: "One Piece",
    subtitle: "Egghead Arc · Episode 1150",
    message: "Episode 1150 is now available! Luffy unleashes Gear 5 in the battle of Future Island.",
    mediaType: "tv",
    mediaId: "37854",
    season: 1,
    episode: 1150,
    posterPath: "https://image.tmdb.org/t/p/w342/cMD9Ygz11yj5G3yEvHQbWv6PL3J.jpg",
    timestamp: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    timeDisplay: "2 hours ago",
    watchUrl: "/watch/tv/37854?season=1&episode=1150",
    badgeText: "EP 1150",
    badgeType: "episode",
  },
  {
    id: "curated_ep_solo_leveling_s1e1",
    category: "episode",
    categoryLabel: "New Episode",
    title: "Solo Leveling",
    subtitle: "Season 1 · Episode 1 \"I'm Used to It\"",
    message: "Sung Jinwoo's double dungeon journey begins. 1080p HD SoftSub & DUB available.",
    mediaType: "tv",
    mediaId: "82452",
    season: 1,
    episode: 1,
    posterPath: "https://image.tmdb.org/t/p/w342/geCRueV3ElhRTr0xtJuClJ7xtOD.jpg",
    timestamp: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
    timeDisplay: "5 hours ago",
    watchUrl: "/watch/tv/82452?season=1&episode=1",
    badgeText: "S1 E1",
    badgeType: "episode",
  },
  {
    id: "curated_rel_dandadan_s1",
    category: "release",
    categoryLabel: "New Release",
    title: "DAN DA DAN",
    subtitle: "Anime Series · Complete Season 1",
    message: "New supernatural action anime added to Anikai catalog with multi-server streams.",
    mediaType: "tv",
    mediaId: "240411",
    posterPath: "https://image.tmdb.org/t/p/w342/b9bA6G9e9QY64JzZ6Wp8j6HwX2B.jpg",
    timestamp: new Date(Date.now() - 14 * 3600 * 1000).toISOString(),
    timeDisplay: "14 hours ago",
    watchUrl: "/watch/tv/240411",
    badgeText: "NEW SERIES",
    badgeType: "release",
  },
  {
    id: "curated_rel_demon_slayer_hashira",
    category: "release",
    categoryLabel: "New Release",
    title: "Demon Slayer: Hashira Training Arc",
    subtitle: "Movie / TV Special · 4K Ultra HD",
    message: "Tanjiro and the Hashira prepare for the ultimate battle against Muzan Kibutsuji.",
    mediaType: "tv",
    mediaId: "85937",
    posterPath: "https://image.tmdb.org/t/p/w342/xUfRZu2mi8jH6SzQEJGP6tjBuYj.jpg",
    timestamp: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
    timeDisplay: "1 day ago",
    watchUrl: "/watch/tv/85937",
    badgeText: "4K HD",
    badgeType: "release",
  },
  {
    id: "curated_upc_solo_leveling_s1e3",
    category: "upcoming",
    categoryLabel: "Upcoming Release",
    title: "Solo Leveling",
    subtitle: "Season 1 · Episode 3 \"It's Like a Game\"",
    message: "Jinwoo awakens with the mysterious Hunter system log. Airing today with live countdown!",
    mediaType: "tv",
    mediaId: "82452",
    season: 1,
    episode: 3,
    posterPath: "https://image.tmdb.org/t/p/w342/geCRueV3ElhRTr0xtJuClJ7xtOD.jpg",
    releaseAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    timeDisplay: "Releasing in 1 hour",
    watchUrl: "/watch/tv/82452?season=1&episode=3",
    badgeText: "IN 1 HOUR",
    badgeType: "upcoming",
    isUpcoming: true,
  },
  {
    id: "curated_upc_chainsaw_man_reze",
    category: "upcoming",
    categoryLabel: "Upcoming Release",
    title: "Chainsaw Man – The Movie: Reze Arc",
    subtitle: "Theatrical Anime Film Premiere",
    message: "New anime movie coming to streaming soon. Add it to your watchlist for launch alert.",
    mediaType: "movie",
    mediaId: "1214484",
    posterPath: "https://image.tmdb.org/t/p/w342/npdB6eFz4qt9CdISEgLO3LwIER5.jpg",
    releaseAt: new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString(),
    timeDisplay: "Coming in 2 days",
    watchUrl: "/watch/movie/1214484",
    badgeText: "COMING SOON",
    badgeType: "upcoming",
    isUpcoming: true,
  },
  {
    id: "curated_upc_bleach_tybw_p3",
    category: "upcoming",
    categoryLabel: "Upcoming Release",
    title: "Bleach: Thousand-Year Blood War",
    subtitle: "Part 3: The Conflict · Episode 30",
    message: "Squad Zero confronts the Schutzstaffel in the Soul King Palace. New episode tomorrow.",
    mediaType: "tv",
    mediaId: "209867",
    season: 3,
    episode: 4,
    posterPath: "https://image.tmdb.org/t/p/w342/2EewFaZrNOeCnZbYtaNLRYalJ9P.jpg",
    releaseAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    timeDisplay: "Tomorrow at 8:00 PM",
    watchUrl: "/watch/tv/209867",
    badgeText: "TOMORROW",
    badgeType: "upcoming",
    isUpcoming: true,
  },
];

/**
 * Gets array of read notification IDs from LocalStorage.
 */
export function getReadNotificationIds() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.READ_NOTIFS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Checks if a specific notification ID has been read.
 */
export function isNotificationRead(id) {
  const readList = getReadNotificationIds();
  return readList.includes(String(id));
}

/**
 * Marks a notification ID as read and dispatches sync event.
 */
export function markNotificationAsRead(id) {
  if (!id) return;
  try {
    const readList = getReadNotificationIds();
    if (!readList.includes(String(id))) {
      readList.push(String(id));
      localStorage.setItem(STORAGE_KEYS.READ_NOTIFS, JSON.stringify(readList));
      window.dispatchEvent(new CustomEvent("anikai_notifications_updated", { detail: { readList } }));
    }
  } catch (err) {
    console.warn("Failed to mark notification read:", err);
  }
}

/**
 * Marks all notification IDs as read.
 */
export function markAllNotificationsAsRead(ids = []) {
  try {
    const current = getReadNotificationIds();
    const merged = Array.from(new Set([...current, ...ids.map(String)]));
    localStorage.setItem(STORAGE_KEYS.READ_NOTIFS, JSON.stringify(merged));
    window.dispatchEvent(new CustomEvent("anikai_notifications_updated", { detail: { readList: merged } }));
  } catch (err) {
    console.warn("Failed to mark all notifications read:", err);
  }
}

/**
 * Formats relative or formatted release time for notifications.
 */
function formatTimeAgoOrUpcoming(isoString, isUpcoming = false) {
  if (!isoString) return isUpcoming ? "Coming soon" : "Recently";
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return "Recently";

  const diffMs = date.getTime() - Date.now();
  
  if (isUpcoming || diffMs > 0) {
    const rem = calculateRemainingTime(isoString);
    if (rem.isExpired) return "Releasing now";
    if (rem.days > 0) {
      return rem.days === 1 ? "Tomorrow" : `In ${rem.days} days`;
    }
    if (rem.hours > 0) return `In ${rem.hours}h ${rem.minutes}m`;
    return `In ${rem.minutes}m`;
  }

  // Past time ago
  const elapsedSec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (elapsedSec < 60) return "Just now";
  const elapsedMin = Math.floor(elapsedSec / 60);
  if (elapsedMin < 60) return `${elapsedMin}m ago`;
  const elapsedHours = Math.floor(elapsedMin / 60);
  if (elapsedHours < 24) return `${elapsedHours}h ago`;
  const elapsedDays = Math.floor(elapsedHours / 24);
  if (elapsedDays === 1) return "Yesterday";
  if (elapsedDays < 7) return `${elapsedDays}d ago`;
  return formatLocalDateTime(isoString, false);
}

// In-memory cache to prevent repeated TMDB API hammering
let notificationCache = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes cache

/**
 * Fetches and dynamically aggregates movie and anime release notifications.
 */
export async function getReleaseNotifications(forceRefresh = false) {
  if (!forceRefresh && notificationCache && Date.now() - lastFetchTime < CACHE_TTL_MS) {
    return notificationCache;
  }

  const notifications = [];
  const addedKeys = new Set();

  function pushNotif(item) {
    if (!item || !item.id || addedKeys.has(item.id)) return;
    addedKeys.add(item.id);
    notifications.push(item);
  }

  // 1. Process CUSTOM_MEDIA_DATABASE episodes & releases
  try {
    Object.entries(CUSTOM_MEDIA_DATABASE).forEach(([id, media]) => {
      if (media.seasons) {
        Object.entries(media.seasons).forEach(([seasonNum, seasonObj]) => {
          if (seasonObj.episodes && Array.isArray(seasonObj.episodes)) {
            seasonObj.episodes.forEach((ep) => {
              const subStatus = ep.sub?.status || STATUS_TYPES.AVAILABLE;
              const subRelease = ep.sub?.releaseAt;
              const isUpcoming = subStatus === STATUS_TYPES.UPCOMING;

              const notifId = `custom_ep_${id}_s${seasonNum}_e${ep.number}`;
              const timeDisplay = formatTimeAgoOrUpcoming(subRelease, isUpcoming);

              pushNotif({
                id: notifId,
                category: isUpcoming ? "upcoming" : "episode",
                categoryLabel: isUpcoming ? "Upcoming Episode" : "New Episode",
                title: media.title,
                subtitle: `Season ${seasonNum} · Episode ${ep.number} "${ep.title || `Episode ${ep.number}`}"`,
                message: isUpcoming
                  ? `Episode ${ep.number} is scheduled for release ${timeDisplay.toLowerCase()}.`
                  : `Episode ${ep.number} is now ready to stream in Full HD with multi-subtitles.`,
                mediaType: "tv",
                mediaId: String(id),
                season: Number(seasonNum),
                episode: Number(ep.number),
                posterPath: media.posterPath || "https://image.tmdb.org/t/p/w342/geCRueV3ElhRTr0xtJuClJ7xtOD.jpg",
                timestamp: subRelease || new Date().toISOString(),
                releaseAt: subRelease,
                timeDisplay,
                watchUrl: `/watch/tv/${id}?season=${seasonNum}&episode=${ep.number}`,
                badgeText: isUpcoming ? "UPCOMING" : `S${seasonNum} E${ep.number}`,
                badgeType: isUpcoming ? "upcoming" : "episode",
                isUpcoming,
              });
            });
          }
        });
      } else if (media.type === "movie") {
        const subStatus = media.sub?.status || STATUS_TYPES.AVAILABLE;
        const subRelease = media.sub?.releaseAt;
        const isUpcoming = subStatus === STATUS_TYPES.UPCOMING;
        const notifId = `custom_movie_${id}`;
        const timeDisplay = formatTimeAgoOrUpcoming(subRelease, isUpcoming);
        pushNotif({
          id: notifId,
          category: isUpcoming ? "upcoming" : "release",
          categoryLabel: isUpcoming ? "Upcoming Movie" : "New Movie",
          title: media.title,
          subtitle: isUpcoming ? "Theatrical / Digital Premiere" : "Movie Premiere · HD Stream",
          message: isUpcoming
            ? `${media.title} premiere is scheduled for ${timeDisplay.toLowerCase()}.`
            : `${media.title} is now available to stream in 1080p HD.`,
          mediaType: "movie",
          mediaId: String(id),
          posterPath: media.posterPath || "https://placehold.co/342x513/141722/a991ff?text=Movie",
          timestamp: subRelease || new Date().toISOString(),
          releaseAt: subRelease,
          timeDisplay,
          watchUrl: `/watch/movie/${id}`,
          badgeText: isUpcoming ? "COMING SOON" : "MOVIE",
          badgeType: isUpcoming ? "upcoming" : "release",
          isUpcoming,
        });
      }
    });
  } catch (err) {
    console.warn("Failed reading custom media database for notifications:", err);
  }

  // 2. Fetch TMDB Airing Today & Discover Anime for live New Episodes
  try {
    const [airingToday, discoverAnime] = await Promise.allSettled([
      getAiringTodayTV(),
      getDiscoverAnime(),
    ]);

    if (airingToday.status === "fulfilled" && airingToday.value?.results) {
      airingToday.value.results.slice(0, 4).forEach((item) => {
        const notifId = `tmdb_airing_${item.id}`;
        pushNotif({
          id: notifId,
          category: "episode",
          categoryLabel: "New Episode",
          title: item.name || item.original_name,
          subtitle: "New Episode Broadcast",
          message: `A new episode has aired today. Watch the latest release now on Anikai!`,
          mediaType: "tv",
          mediaId: String(item.id),
          posterPath: tmdbImage(item.poster_path, "w342") || fallbackPoster(item.name),
          timestamp: item.first_air_date || new Date().toISOString(),
          timeDisplay: "Aired today",
          watchUrl: `/watch/tv/${item.id}`,
          badgeText: "AIRING NOW",
          badgeType: "episode",
        });
      });
    }

    if (discoverAnime.status === "fulfilled" && discoverAnime.value?.results) {
      discoverAnime.value.results.slice(0, 3).forEach((item) => {
        const notifId = `tmdb_anime_hot_${item.id}`;
        pushNotif({
          id: notifId,
          category: "release",
          categoryLabel: "Trending Anime",
          title: item.name || item.original_name,
          subtitle: "Trending Anime Series",
          message: `${item.name} is currently trending with high community ratings.`,
          mediaType: "tv",
          mediaId: String(item.id),
          posterPath: tmdbImage(item.poster_path, "w342"),
          timestamp: new Date(Date.now() - 3600 * 4000).toISOString(),
          timeDisplay: "Recently added",
          watchUrl: `/watch/tv/${item.id}`,
          badgeText: "HOT ANIME",
          badgeType: "release",
        });
      });
    }
  } catch (err) {
    console.warn("TMDB Airing/Anime fetch error:", err);
  }

  // 3. Fetch Now Playing Movies for New Releases
  try {
    const nowPlaying = await getNowPlayingMovies();
    if (nowPlaying?.results) {
      nowPlaying.results.slice(0, 4).forEach((movie) => {
        const notifId = `tmdb_movie_np_${movie.id}`;
        pushNotif({
          id: notifId,
          category: "release",
          categoryLabel: "New Release",
          title: movie.title || movie.original_title,
          subtitle: "Movie Premiere · HD Stream",
          message: `${movie.title} is now available for streaming on Anikai servers.`,
          mediaType: "movie",
          mediaId: String(movie.id),
          posterPath: tmdbImage(movie.poster_path, "w342"),
          timestamp: movie.release_date || new Date().toISOString(),
          timeDisplay: formatTimeAgoOrUpcoming(movie.release_date, false),
          watchUrl: `/watch/movie/${movie.id}`,
          badgeText: "NEW MOVIE",
          badgeType: "release",
        });
      });
    }
  } catch (err) {
    console.warn("TMDB Now Playing fetch error:", err);
  }

  // 4. Fetch Upcoming Movies & TV for Upcoming Releases
  try {
    const upcoming = await getUpcomingMovies();
    if (upcoming?.results) {
      upcoming.results.slice(0, 4).forEach((movie) => {
        const notifId = `tmdb_movie_upc_${movie.id}`;
        const timeDisplay = formatTimeAgoOrUpcoming(movie.release_date, true);
        pushNotif({
          id: notifId,
          category: "upcoming",
          categoryLabel: "Upcoming Premiere",
          title: movie.title || movie.original_title,
          subtitle: "Upcoming Theatrical / Digital Premiere",
          message: `Expected release: ${movie.release_date || "Coming soon"}. Tap to view trailer and details.`,
          mediaType: "movie",
          mediaId: String(movie.id),
          posterPath: tmdbImage(movie.poster_path, "w342"),
          timestamp: movie.release_date || new Date().toISOString(),
          releaseAt: movie.release_date,
          timeDisplay,
          watchUrl: `/watch/movie/${movie.id}`,
          badgeText: "PREMIERE",
          badgeType: "upcoming",
          isUpcoming: true,
        });
      });
    }
  } catch (err) {
    console.warn("TMDB Upcoming fetch error:", err);
  }

  // 5. Check User Watch History for custom resume alerts
  try {
    const watchProgress = getAllWatchProgress();
    const progressList = Object.values(watchProgress)
      .filter((p) => p.title && p.id)
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
      .slice(0, 2);

    progressList.forEach((item) => {
      const notifId = `user_history_${item.key}`;
      if (item.type === "tv" || item.type === "anime") {
        pushNotif({
          id: notifId,
          category: "episode",
          categoryLabel: "Continue Watching",
          title: item.title,
          subtitle: `Season ${item.season || 1} · Episode ${item.episode || 1}`,
          message: `Pick up where you left off (${item.progressPercent || 0}% completed).`,
          mediaType: "tv",
          mediaId: String(item.id),
          season: item.season || 1,
          episode: item.episode || 1,
          posterPath: item.posterPath ? tmdbImage(item.posterPath, "w342") : "",
          timestamp: new Date(item.updatedAt || Date.now()).toISOString(),
          timeDisplay: "Watched recently",
          watchUrl: `/watch/tv/${item.id}?season=${item.season || 1}&episode=${item.episode || 1}`,
          badgeText: `RESUME ${item.progressPercent || 0}%`,
          badgeType: "episode",
        });
      }
    });
  } catch (err) {
    console.warn("Watch history notification injection error:", err);
  }

  // 6. Merge Curated Items if list is small (ensures high quality showcase)
  CURATED_RELEASES.forEach((curated) => {
    pushNotif(curated);
  });

  // Sort: Unread/upcoming/newest first
  notificationCache = notifications;
  lastFetchTime = Date.now();

  return notifications;
}

function fallbackPoster(title) {
  return `https://placehold.co/342x513/141722/a991ff?text=${encodeURIComponent(title || "Anime")}`;
}
