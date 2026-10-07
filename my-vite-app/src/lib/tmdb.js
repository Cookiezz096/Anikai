const KEY = import.meta.env.VITE_TMDB_API_KEY;
const BASE = "https://api.themoviedb.org/3";
const IMG = "https://image.tmdb.org/t/p/";

async function request(path, params = {}) {
  if (!KEY) throw new Error("TMDB API key is not configured.");
  const url = new URL(BASE + path);
  url.searchParams.set("api_key", KEY);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url);
  if (!res.ok) throw new Error(`TMDB request failed: ${res.status}`);
  return res.json();
}

export const tmdbImage = (path, size = "w500") =>
  path ? `${IMG}${size}${path}` : "";

export const getTrending = () => request("/trending/all/week");
export const getPopularMovies = () => request("/movie/popular");
export const getPopularTV = () => request("/tv/popular");
export const getNowPlayingMovies = () => request("/movie/now_playing");
export const getUpcomingMovies = () => request("/movie/upcoming");
export const getAiringTodayTV = () => request("/tv/airing_today");
export const getOnTheAirTV = () => request("/tv/on_the_air");
export const getDiscoverAnime = () =>
  request("/discover/tv", { with_genres: "16", sort_by: "popularity.desc" });
export const searchMulti = (query) =>
  request("/search/multi", { query, include_adult: "false" });

export const getMovie = (id) =>
  request(`/movie/${id}`, {
    append_to_response: "credits,videos,external_ids,recommendations,similar",
  });

export const getTV = (id) =>
  request(`/tv/${id}`, {
    append_to_response: "credits,videos,external_ids,recommendations,similar",
  });

export const getSeason = (id, season) =>
  request(`/tv/${id}/season/${season}`);

export const getWatchProviders = (type, id) => {
  const endpoint = type === "movie" ? "movie" : "tv";
  return request(`/${endpoint}/${id}/watch/providers`);
};


/**
 * Extracts the official YouTube trailer embed URL if available
 */
export function getOfficialTrailerUrl(videos) {
  if (!videos?.results || videos.results.length === 0) return null;
  const list = videos.results.filter((v) => v.site === "YouTube");
  const trailer =
    list.find((v) => v.type === "Trailer" && v.official) ||
    list.find((v) => v.type === "Trailer") ||
    list.find((v) => v.type === "Teaser") ||
    list[0];
  return trailer
    ? `https://www.youtube-nocookie.com/embed/${trailer.key}?autoplay=1&rel=0`
    : null;
}