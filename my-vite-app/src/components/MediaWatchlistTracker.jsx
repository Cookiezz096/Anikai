import React, { useState, useEffect } from "react";
import { saveToWatchlist, fetchWatchlist, removeFromWatchlist } from "../lib/watchlistService";
import {
  BookmarkPlus,
  Check,
  Star,
  Plus,
  Minus,
  Heart,
  Eye,
  CheckCircle,
  PauseCircle,
  XCircle,
  Trash2
} from "lucide-react";

const STATUS_CONFIG = {
  plan_to_watch: { label: "Plan to Watch", icon: BookmarkPlus, color: "#38bdf8" },
  watching: { label: "Watching", icon: Eye, color: "#a991ff" },
  completed: { label: "Completed", icon: CheckCircle, color: "#34d399" },
  on_hold: { label: "On Hold", icon: PauseCircle, color: "#fbbf24" },
  dropped: { label: "Dropped", icon: XCircle, color: "#f87171" },
};

export default function MediaWatchlistTracker({
  media,
  mediaType = "movie",
  totalEpisodes = null,
  onStatusChange,
}) {
  const [currentEntry, setCurrentEntry] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [userScore, setUserScore] = useState(0);
  const [episodesWatched, setEpisodesWatched] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);

  const mediaId = media?.id;
  const isAnime = mediaType === "anime" || media?.isAnime;
  const maxEpisodes = totalEpisodes || media?.number_of_episodes || media?.episodes || 0;

  // Load current watchlist state for this media item
  useEffect(() => {
    let active = true;
    async function loadItemState() {
      const list = await fetchWatchlist();
      if (!active) return;

      const found = list.find(
        (i) => (media?.tmdb_id && i.tmdb_id === media.tmdb_id) ||
               (media?.anilist_id && i.anilist_id === media.anilist_id) ||
               (mediaId && (i.tmdb_id === mediaId || i.anilist_id === mediaId || i.id === mediaId))
      );

      if (found) {
        setCurrentEntry(found);
        setUserScore(found.user_score || 0);
        setEpisodesWatched(found.episodes_watched || 0);
        setIsFavorite(Boolean(found.is_favorite));
      } else {
        setCurrentEntry(null);
      }
    }

    loadItemState();
    return () => {
      active = false;
    };
  }, [media, mediaId]);

  const handleSetStatus = async (statusKey) => {
    setLoading(true);
    setShowStatusMenu(false);
    try {
      const res = await saveToWatchlist(media, {
        status: statusKey,
        user_score: userScore,
        episodes_watched: statusKey === "completed" && maxEpisodes ? maxEpisodes : episodesWatched,
        is_favorite: isFavorite,
      });
      if (res?.item) {
        setCurrentEntry(res.item);
        if (onStatusChange) onStatusChange(res.item);
      }
    } catch (err) {
      console.error("Failed to update status:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleScoreChange = async (score) => {
    setUserScore(score);
    if (currentEntry) {
      await saveToWatchlist(media, {
        status: currentEntry.status,
        user_score: score,
        episodes_watched: episodesWatched,
        is_favorite: isFavorite,
      });
    }
  };

  const handleEpisodeIncrement = async (delta) => {
    const nextVal = Math.max(0, (episodesWatched || 0) + delta);
    if (maxEpisodes && nextVal > maxEpisodes) return;

    setEpisodesWatched(nextVal);
    const newStatus = (maxEpisodes && nextVal >= maxEpisodes) ? "completed" : (currentEntry?.status || "watching");

    await saveToWatchlist(media, {
      status: newStatus,
      user_score: userScore,
      episodes_watched: nextVal,
      is_favorite: isFavorite,
    });
  };

  const handleToggleFavorite = async () => {
    const nextFav = !isFavorite;
    setIsFavorite(nextFav);
    if (currentEntry) {
      await saveToWatchlist(media, {
        status: currentEntry.status,
        user_score: userScore,
        episodes_watched: episodesWatched,
        is_favorite: nextFav,
      });
    }
  };

  const handleRemove = async () => {
    if (!currentEntry) return;
    setLoading(true);
    await removeFromWatchlist(currentEntry.media_id, media?.tmdb_id || mediaId, media?.anilist_id);
    setCurrentEntry(null);
    setLoading(false);
    if (onStatusChange) onStatusChange(null);
  };

  const activeConfig = currentEntry ? STATUS_CONFIG[currentEntry.status] : null;
  const ActiveIcon = activeConfig ? activeConfig.icon : BookmarkPlus;

  return (
    <div className="tracker-card-widget">
      <div className="tracker-main-bar">
        {/* Status Dropdown Trigger */}
        <div className="tracker-status-dropdown-wrap">
          <button
            className={`tracker-status-btn ${currentEntry ? "tracked" : ""}`}
            onClick={() => setShowStatusMenu((prev) => !prev)}
            disabled={loading}
          >
            <ActiveIcon size={16} style={{ color: activeConfig ? activeConfig.color : "inherit" }} />
            <span>{activeConfig ? activeConfig.label : "Add to Watchlist"}</span>
          </button>

          {showStatusMenu && (
            <div className="tracker-status-menu">
              <div className="tracker-menu-title">Select List Status</div>
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
                const ItemIcon = cfg.icon;
                const isSelected = currentEntry?.status === key;
                return (
                  <button
                    key={key}
                    className={`tracker-menu-item ${isSelected ? "selected" : ""}`}
                    onClick={() => handleSetStatus(key)}
                  >
                    <ItemIcon size={15} style={{ color: cfg.color }} />
                    <span>{cfg.label}</span>
                    {isSelected && <Check size={14} className="check-icon" />}
                  </button>
                );
              })}
              {currentEntry && (
                <button className="tracker-menu-item remove-action" onClick={handleRemove}>
                  <Trash2 size={15} />
                  <span>Remove from Watchlist</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Favorite Button */}
        <button
          className={`tracker-fav-btn ${isFavorite ? "active" : ""}`}
          onClick={handleToggleFavorite}
          title={isFavorite ? "Favorited" : "Add to favorites"}
        >
          <Heart size={16} fill={isFavorite ? "#ef4444" : "none"} color={isFavorite ? "#ef4444" : "currentColor"} />
        </button>
      </div>

      {/* Expanded Progress & Rating Controls (Visible if item is tracked) */}
      {currentEntry && (
        <div className="tracker-extended-controls">
          {/* Episode Progress for TV & Anime */}
          {(mediaType === "tv" || isAnime || maxEpisodes > 0) && (
            <div className="tracker-progress-row">
              <span className="tracker-control-label">Progress:</span>
              <div className="progress-counter-group">
                <button
                  className="counter-btn"
                  onClick={() => handleEpisodeIncrement(-1)}
                  disabled={episodesWatched <= 0}
                >
                  <Minus size={13} />
                </button>
                <span className="counter-display">
                  <strong>{episodesWatched}</strong>
                  {maxEpisodes > 0 && <span className="counter-max"> / {maxEpisodes} eps</span>}
                </span>
                <button
                  className="counter-btn"
                  onClick={() => handleEpisodeIncrement(1)}
                  disabled={maxEpisodes > 0 && episodesWatched >= maxEpisodes}
                >
                  <Plus size={13} />
                </button>
              </div>
            </div>
          )}

          {/* 10-Star Rating Bar */}
          <div className="tracker-rating-row">
            <span className="tracker-control-label">Your Rating:</span>
            <div className="tracker-stars-group">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
                <button
                  key={star}
                  className={`star-rate-btn ${userScore >= star ? "filled" : ""}`}
                  onClick={() => handleScoreChange(star)}
                  title={`${star}/10`}
                >
                  <Star size={13} fill={userScore >= star ? "#fbbf24" : "none"} />
                </button>
              ))}
              {userScore > 0 && <span className="star-score-text">{userScore}/10</span>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
