import { supabase } from "./supabase";

const LOCAL_STORAGE_KEY = "stream_media_watchlist_v1";

// Helper for local storage persistence when user is not logged in
function getLocalWatchlist() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("Local storage error:", e);
    return [];
  }
}

function saveLocalWatchlist(list) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    console.error("Local storage save error:", e);
  }
}

/**
 * Normalizes movie/tv/anime metadata to the polymorphic media schema
 */
export function formatMediaForCatalog(media, mediaType = "movie") {
  const isAnime = mediaType === "anime" || media.isAnime;
  const resolvedType = isAnime ? "anime" : (mediaType === "tv" || media.first_air_date ? "tv" : "movie");

  return {
    media_type: resolvedType,
    tmdb_id: media.tmdb_id || (media.id && !media.isAniList ? media.id : null),
    anilist_id: media.anilist_id || (media.isAniList ? media.id : null),
    imdb_id: media.imdb_id || null,
    title: media.title?.english || media.title?.romaji || media.title || media.name || "Untitled",
    original_title: media.original_title || media.original_name || (typeof media.title === "object" ? media.title?.native : null),
    poster_path: media.poster_path || media.coverImage?.large || media.coverImage?.extraLarge || null,
    backdrop_path: media.backdrop_path || media.bannerImage || null,
    release_year: media.release_date ? parseInt(media.release_date.slice(0, 4), 10) :
                  media.first_air_date ? parseInt(media.first_air_date.slice(0, 4), 10) :
                  media.startDate?.year || null,
    overview: media.overview || media.description || "",
    genres: media.genres || (media.genre_ids ? [] : []),
    total_episodes: media.number_of_episodes || media.episodes || null,
    total_seasons: media.number_of_seasons || null,
    vote_average: media.vote_average || (media.averageScore ? (media.averageScore / 10).toFixed(1) : null),
    metadata: {
      siteUrl: media.siteUrl || null,
      status: media.status || null,
      popularity: media.popularity || null,
    }
  };
}

/**
 * Fetch all watchlist items for the active user
 */
export async function fetchWatchlist() {
  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data, error } = await supabase
        .from("user_watchlist_detailed")
        .select("*")
        .order("list_updated_at", { ascending: false });

      if (!error && data) {
        return data;
      }
      if (error) {
        console.warn("Supabase fetch failed, falling back to local storage:", error.message);
      }
    }
  }

  return getLocalWatchlist();
}

/**
 * Save or update an item in the watchlist
 */
export async function saveToWatchlist(media, trackingData = {}) {
  const normalizedMedia = formatMediaForCatalog(media, media.media_type || "movie");
  const initialStatus = trackingData.status || "plan_to_watch";

  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      try {
        // 1. Upsert into media_catalog
        let query = supabase.from("media_catalog");
        let conflictColumn = normalizedMedia.tmdb_id ? "media_type, tmdb_id" : "media_type, anilist_id";
        
        const { data: catalogItem, error: catErr } = await supabase
          .from("media_catalog")
          .upsert(normalizedMedia, { onConflict: conflictColumn })
          .select()
          .single();

        if (catErr) throw catErr;

        // 2. Upsert into user_watchlists
        const userEntry = {
          user_id: user.id,
          media_id: catalogItem.id,
          status: initialStatus,
          user_score: trackingData.user_score ?? null,
          episodes_watched: trackingData.episodes_watched ?? 0,
          seasons_watched: trackingData.seasons_watched ?? 0,
          is_favorite: trackingData.is_favorite ?? false,
          notes: trackingData.notes ?? null,
          last_watched_at: new Date().toISOString(),
        };

        const { data: savedEntry, error: listErr } = await supabase
          .from("user_watchlists")
          .upsert(userEntry, { onConflict: "user_id, media_id" })
          .select()
          .single();

        if (listErr) throw listErr;

        return { success: true, item: { ...catalogItem, ...savedEntry } };
      } catch (err) {
        console.warn("Supabase save failed, storing in local fallback:", err);
      }
    }
  }

  // Fallback to local storage
  const localList = getLocalWatchlist();
  const existingIdx = localList.findIndex(
    (i) => (normalizedMedia.tmdb_id && i.tmdb_id === normalizedMedia.tmdb_id) ||
           (normalizedMedia.anilist_id && i.anilist_id === normalizedMedia.anilist_id) ||
           (i.title === normalizedMedia.title)
  );

  const newEntry = {
    ...normalizedMedia,
    watchlist_id: `local-${Date.now()}`,
    media_id: `media-${Date.now()}`,
    status: initialStatus,
    user_score: trackingData.user_score ?? (existingIdx >= 0 ? localList[existingIdx].user_score : null),
    episodes_watched: trackingData.episodes_watched ?? (existingIdx >= 0 ? localList[existingIdx].episodes_watched : 0),
    seasons_watched: trackingData.seasons_watched ?? (existingIdx >= 0 ? localList[existingIdx].seasons_watched : 0),
    is_favorite: trackingData.is_favorite ?? (existingIdx >= 0 ? localList[existingIdx].is_favorite : false),
    notes: trackingData.notes ?? (existingIdx >= 0 ? localList[existingIdx].notes : ""),
    last_watched_at: new Date().toISOString(),
    list_updated_at: new Date().toISOString(),
  };

  if (existingIdx >= 0) {
    localList[existingIdx] = { ...localList[existingIdx], ...newEntry };
  } else {
    localList.unshift(newEntry);
  }

  saveLocalWatchlist(localList);
  return { success: true, item: newEntry };
}

/**
 * Remove an item from the watchlist
 */
export async function removeFromWatchlist(mediaId, tmdbId, anilistId) {
  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user && mediaId && !mediaId.startsWith("media-")) {
      const { error } = await supabase
        .from("user_watchlists")
        .delete()
        .eq("user_id", user.id)
        .eq("media_id", mediaId);
      if (!error) return true;
    }
  }

  const localList = getLocalWatchlist().filter(
    (i) => (mediaId && i.media_id !== mediaId) &&
           (!tmdbId || i.tmdb_id !== tmdbId) &&
           (!anilistId || i.anilist_id !== anilistId)
  );
  saveLocalWatchlist(localList);
  return true;
}
