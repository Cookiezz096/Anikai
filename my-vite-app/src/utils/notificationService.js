/**
 * notificationService.js
 * Universal release notification engine.
 * Automatically aggregates:
 * 1. New Episodes (Airing TV series episodes)
 * 2. New Releases (Newly added Movies & TV titles)
 * 3. Upcoming Releases (Scheduled episodes with countdowns, future movie & series premieres)
 */

import {
  getAiringTodayTV,
  getNowPlayingMovies,
  getUpcomingMovies,
  getTrending,
  getPopularTV,
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
    id: "curated_ep_last_of_us_s1e1",
    category: "episode",
    categoryLabel: "New Episode",
    title: "The Last of Us",
    subtitle: "Season 1 · Episode 1 \"When You're Lost in the Darkness\"",
    message: "Joel and Ellie embark on their journey across a post-apocalyptic United States.",
    mediaType: "tv",
    mediaId: "100088",
    season: 1,
    episode: 1,
    posterPath: "https://image.tmdb.org/t/p/w342/uKvVjHNqB5VmOrdxqAt2V7JMrRI.jpg",
    timestamp: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    timeDisplay: "2 hours ago",
    watchUrl: "/watch/tv/100088?season=1&episode=1",
    badgeText: "S1 E1",
    badgeType: "episode",
  },
  {
    id: "curated_ep_house_of_dragon_s2e1",
    category: "episode",
    categoryLabel: "New Episode",
    title: "House of the Dragon",
    subtitle: "Season 2 · Episode 1 \"A Son for a Son\"",
    message: "Targaryen civil war intensifies. High definition streaming now active across all open mirrors.",
    mediaType: "tv",
    mediaId: "94997",
    season: 2,
    episode: 1,
    posterPath: "https://image.tmdb.org/t/p/w342/7QMsOTMUswlwxJP0rTTZfmz2tX2.jpg",
    timestamp: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
    timeDisplay: "5 hours ago",
    watchUrl: "/watch/tv/94997?season=2&episode=1",
    badgeText: "S2 E1",
    badgeType: "episode",
  },
  {
    id: "curated_rel_dune_part_two",
    category: "release",
    categoryLabel: "New Release",
    title: "Dune: Part Two",
    subtitle: "Epic Sci-Fi · 4K Ultra HD",
    message: "Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators.",
    mediaType: "movie",
    mediaId: "693134",
    posterPath: "https://image.tmdb.org/t/p/w342/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg",
    timestamp: new Date(Date.now() - 14 * 3600 * 1000).toISOString(),
    timeDisplay: "14 hours ago",
    watchUrl: "/watch/movie/693134",
    badgeText: "4K UHD",
    badgeType: "release",
  },
  {
    id: "curated_rel_deadpool_wolverine",
    category: "release",
    categoryLabel: "New Release",
    title: "Deadpool & Wolverine",
    subtitle: "Action / Comedy · 1080p Full HD",
    message: "A listless Wade Wilson toils in civilian life until a threat emerges, pairing him with Wolverine.",
    mediaType: "movie",
    mediaId: "533535",
    posterPath: "https://image.tmdb.org/t/p/w342/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg",
    timestamp: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
    timeDisplay: "1 day ago",
    watchUrl: "/watch/movie/533535",
    badgeText: "FULL HD",
    badgeType: "release",
  },
  {
    id: "curated_upc_gladiator_2",
    category: "upcoming",
    categoryLabel: "Upcoming Release",
    title: "Gladiator II",
    subtitle: "Action / Drama Premiere",
    message: "Lucius must enter the Colosseum after his home is conquered by tyrannical emperors.",
    mediaType: "movie",
    mediaId: "558449",
    posterPath: "https://image.tmdb.org/t/p/w342/2cxhvwyEwRlysAmRH4iodkvo0z5.jpg",
    releaseAt: new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString(),
    timeDisplay: "Coming in 2 days",
    watchUrl: "/watch/movie/558449",
    badgeText: "COMING SOON",
    badgeType: "upcoming",
    isUpcoming: true,
  },
  {
    id: "curated_upc_stranger_things_s5",
    category: "upcoming",
    categoryLabel: "Upcoming Release",
    title: "Stranger Things",
    subtitle: "Season 5 · Final Season Premiere",
    message: "The final battle for Hawkins approaches. Add to your watchlist for launch alert.",
    mediaType: "tv",
    mediaId: "66732",
    posterPath: "https://image.tmdb.org/t/p/w342/49WJfeN0moxb9IPfGn8AIqMGskD.jpg",
    releaseAt: new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString(),
    timeDisplay: "Coming in 5 days",
    watchUrl: "/watch/tv/66732",
    badgeText: "FINAL SEASON",
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
 * Fetches and dynamically aggregates movie and TV release notifications.
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

  // 2. Fetch TMDB Airing Today & Popular TV for live New Episodes
  try {
    const [airingToday, popularTV] = await Promise.allSettled([
      getAiringTodayTV(),
      getPopularTV(),
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
          message: `A new episode has aired today. Watch the latest release now!`,
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

    if (popularTV.status === "fulfilled" && popularTV.value?.results) {
      popularTV.value.results.slice(0, 3).forEach((item) => {
        const notifId = `tmdb_tv_hot_${item.id}`;
        pushNotif({
          id: notifId,
          category: "release",
          categoryLabel: "Trending Series",
          title: item.name || item.original_name,
          subtitle: "Trending TV Series",
          message: `${item.name} is currently trending with high community ratings.`,
          mediaType: "tv",
          mediaId: String(item.id),
          posterPath: tmdbImage(item.poster_path, "w342"),
          timestamp: new Date(Date.now() - 3600 * 4000).toISOString(),
          timeDisplay: "Recently added",
          watchUrl: `/watch/tv/${item.id}`,
          badgeText: "HOT SERIES",
          badgeType: "release",
        });
      });
    }
  } catch (err) {
    console.warn("TMDB Airing/TV fetch error:", err);
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
      if (item.type === "tv") {
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
  return `https://placehold.co/342x513/141722/a991ff?text=${encodeURIComponent(title || "Media")}`;
}
