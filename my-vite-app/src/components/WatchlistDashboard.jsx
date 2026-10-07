import React, { useState, useEffect } from "react";
import { fetchWatchlist, saveToWatchlist, removeFromWatchlist } from "../lib/watchlistService";
import { tmdbImage } from "../lib/tmdb";
import {
  Bookmark,
  Film,
  Tv,
  Sparkles,
  Star,
  CheckCircle2,
  Clock,
  Trash2,
  Plus,
  Minus,
  ExternalLink,
  Filter,
  Play
} from "lucide-react";

const STATUS_TABS = [
  { key: "all", label: "All Titles" },
  { key: "watching", label: "Watching" },
  { key: "plan_to_watch", label: "Plan to Watch" },
  { key: "completed", label: "Completed" },
  { key: "on_hold", label: "On Hold" },
  { key: "dropped", label: "Dropped" },
];

const TYPE_TABS = [
  { key: "all", label: "All Media", icon: Bookmark },
  { key: "movie", label: "Movies", icon: Film },
  { key: "tv", label: "TV Shows", icon: Tv },
  { key: "anime", label: "Anime", icon: Sparkles },
];

export default function WatchlistDashboard({ onSelectMedia }) {
  const [watchlist, setWatchlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeStatus, setActiveStatus] = useState("all");
  const [activeType, setActiveType] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const refreshList = async () => {
    setLoading(true);
    const data = await fetchWatchlist();
    setWatchlist(data || []);
    setLoading(false);
  };

  useEffect(() => {
    refreshList();
  }, []);

  const handleIncrement = async (item, delta) => {
    const nextVal = Math.max(0, (item.episodes_watched || 0) + delta);
    const max = item.total_episodes;
    if (max && nextVal > max) return;

    const newStatus = (max && nextVal >= max) ? "completed" : item.status;
    await saveToWatchlist(item, {
      ...item,
      episodes_watched: nextVal,
      status: newStatus,
    });
    refreshList();
  };

  const handleRemove = async (item) => {
    await removeFromWatchlist(item.media_id, item.tmdb_id, item.anilist_id);
    refreshList();
  };

  // Filtering
  const filteredList = watchlist.filter((item) => {
    const matchesStatus = activeStatus === "all" || item.status === activeStatus;
    const matchesType = activeType === "all" || item.media_type === activeType;
    const matchesSearch = !searchQuery || 
      item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.original_title?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesType && matchesSearch;
  });

  return (
    <div className="watchlist-dashboard-wrapper">
      {/* Header */}
      <div className="dashboard-header-block">
        <div>
          <h2 className="dashboard-main-heading">My Media Watchlist</h2>
          <p className="dashboard-subtext">
            Track and synchronize your movies, TV series, and anime in one unified hub
          </p>
        </div>
        <div className="dashboard-stats-strip">
          <div className="stat-pill">
            <span className="stat-num">{watchlist.length}</span>
            <span className="stat-label">Total Saved</span>
          </div>
          <div className="stat-pill">
            <span className="stat-num">{watchlist.filter((i) => i.status === "watching").length}</span>
            <span className="stat-label">In Progress</span>
          </div>
          <div className="stat-pill">
            <span className="stat-num">{watchlist.filter((i) => i.status === "completed").length}</span>
            <span className="stat-label">Completed</span>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="dashboard-filters-bar">
        {/* Media Type Filters */}
        <div className="type-toggle-group">
          {TYPE_TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                className={`type-filter-btn ${activeType === tab.key ? "active" : ""}`}
                onClick={() => setActiveType(tab.key)}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Search within watchlist */}
        <div className="watchlist-search-input-wrap">
          <Filter size={14} className="search-filter-icon" />
          <input
            type="text"
            placeholder="Search saved titles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="watchlist-search-input"
          />
        </div>
      </div>

      {/* Status Tabs */}
      <div className="status-tabs-row">
        {STATUS_TABS.map((tab) => {
          const count = watchlist.filter(
            (i) => (tab.key === "all" || i.status === tab.key) &&
                   (activeType === "all" || i.media_type === activeType)
          ).length;

          return (
            <button
              key={tab.key}
              className={`status-tab-btn ${activeStatus === tab.key ? "active" : ""}`}
              onClick={() => setActiveStatus(tab.key)}
            >
              <span>{tab.label}</span>
              <span className="tab-count-badge">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="watchlist-loading-state">
          <div className="providers-spinner" />
          <span>Synchronizing watchlist catalog...</span>
        </div>
      )}

      {/* Content Grid */}
      {!loading && (
        <>
          {filteredList.length > 0 ? (
            <div className="watchlist-cards-grid">
              {filteredList.map((item) => {
                const posterUrl = item.poster_path
                  ? item.poster_path.startsWith("http")
                    ? item.poster_path
                    : tmdbImage(item.poster_path, "w342")
                  : null;

                const maxEps = item.total_episodes || 0;
                const progressPercent = maxEps > 0
                  ? Math.min(100, Math.round(((item.episodes_watched || 0) / maxEps) * 100))
                  : 0;

                return (
                  <div key={item.watchlist_id || item.id} className="watchlist-card">
                    {/* Poster */}
                    <div className="watchlist-poster-wrap">
                      {posterUrl ? (
                        <img src={posterUrl} alt={item.title} className="watchlist-poster-img" loading="lazy" />
                      ) : (
                        <div className="watchlist-poster-fallback">
                          <Film size={32} />
                        </div>
                      )}

                      <span className={`media-type-tag tag-${item.media_type}`}>
                        {item.media_type?.toUpperCase()}
                      </span>

                      {item.user_score > 0 && (
                        <div className="card-user-score">
                          <Star size={12} fill="#fbbf24" color="#fbbf24" />
                          <span>{item.user_score}</span>
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="watchlist-info-wrap">
                      <h4 className="watchlist-item-title" title={item.title}>
                        {item.title}
                      </h4>
                      <div className="watchlist-item-meta">
                        {item.release_year && <span>{item.release_year}</span>}
                        {item.genres && Array.isArray(item.genres) && item.genres.length > 0 && (
                          <span>• {item.genres[0]?.name || item.genres[0]}</span>
                        )}
                      </div>

                      {/* Episode Progress Bar */}
                      {(item.media_type === "tv" || item.media_type === "anime" || maxEps > 0) && (
                        <div className="watchlist-progress-bar-container">
                          <div className="progress-bar-header">
                            <span>Progress</span>
                            <span>{item.episodes_watched || 0} / {maxEps > 0 ? `${maxEps} eps` : "—"}</span>
                          </div>
                          <div className="progress-track">
                            <div
                              className="progress-fill"
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>
                          <div className="progress-stepper">
                            <button
                              className="stepper-btn"
                              onClick={() => handleIncrement(item, -1)}
                              disabled={(item.episodes_watched || 0) <= 0}
                              title="Decrease 1 episode"
                            >
                              <Minus size={11} />
                            </button>
                            <button
                              className="stepper-btn"
                              onClick={() => handleIncrement(item, 1)}
                              disabled={maxEps > 0 && (item.episodes_watched || 0) >= maxEps}
                              title="Increase 1 episode"
                            >
                              <Plus size={11} />
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Card Actions */}
                      <div className="watchlist-card-actions">
                        {onSelectMedia && (
                          <button
                            className="card-action-btn primary-action"
                            onClick={() => onSelectMedia(item)}
                          >
                            <Play size={13} fill="currentColor" />
                            <span>Details & Providers</span>
                          </button>
                        )}
                        <button
                          className="card-action-btn remove-btn"
                          onClick={() => handleRemove(item)}
                          title="Remove from watchlist"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="watchlist-empty-state">
              <Bookmark size={40} className="empty-bookmark-icon" />
              <h3>No titles found in this view</h3>
              <p>Add movies, television shows, or anime to track your viewing journey</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
