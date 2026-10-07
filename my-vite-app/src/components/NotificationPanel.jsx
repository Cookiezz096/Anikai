import React, { useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Bell,
  CheckCheck,
  Tv,
  Film,
  Sparkles,
  Clock,
  Calendar,
  ExternalLink,
  ChevronRight,
  Play,
  RotateCcw,
} from "lucide-react";

export default function NotificationPanel({
  notifications = [],
  readIds = [],
  unreadCount = 0,
  onMarkAsRead,
  onMarkAllRead,
  onClose,
  isDropdown = true,
}) {
  const [activeTab, setActiveTab] = useState("all");
  const navigate = useNavigate();

  const filteredNotifications = useMemo(() => {
    if (activeTab === "all") return notifications;
    if (activeTab === "episodes") {
      return notifications.filter((n) => n.category === "episode");
    }
    if (activeTab === "releases") {
      return notifications.filter((n) => n.category === "release");
    }
    if (activeTab === "upcoming") {
      return notifications.filter((n) => n.category === "upcoming" || n.isUpcoming);
    }
    return notifications;
  }, [notifications, activeTab]);

  const counts = useMemo(() => {
    return {
      all: notifications.length,
      episodes: notifications.filter((n) => n.category === "episode").length,
      releases: notifications.filter((n) => n.category === "release").length,
      upcoming: notifications.filter((n) => n.category === "upcoming" || n.isUpcoming).length,
    };
  }, [notifications]);

  const handleItemClick = (item) => {
    if (onMarkAsRead) {
      onMarkAsRead(item.id);
    }
    if (onClose) {
      onClose();
    }
    if (item.watchUrl) {
      navigate(item.watchUrl);
    }
  };

  return (
    <div className={isDropdown ? "notification-dropdown-panel" : "notification-page-container"}>
      {/* Dropdown Header */}
      <div className="notif-header">
        <div className="notif-title-area">
          <div className="notif-title-row">
            <Bell size={18} className="notif-bell-icon" />
            <h3>Notifications</h3>
            {unreadCount > 0 ? (
              <span className="notif-unread-pill">{unreadCount} New</span>
            ) : (
              <span className="notif-caught-up-pill">Caught up</span>
            )}
          </div>
          <p className="notif-subtitle">New anime episodes, movie releases &amp; upcoming schedules</p>
        </div>

        {unreadCount > 0 && (
          <button
            className="notif-mark-read-btn"
            onClick={onMarkAllRead}
            title="Mark all notifications as read"
          >
            <CheckCheck size={14} />
            <span>Mark all read</span>
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="notif-tabs">
        <button
          className={`notif-tab ${activeTab === "all" ? "active" : ""}`}
          onClick={() => setActiveTab("all")}
        >
          <span>All</span>
          <span className="notif-tab-count">{counts.all}</span>
        </button>
        <button
          className={`notif-tab ${activeTab === "episodes" ? "active" : ""}`}
          onClick={() => setActiveTab("episodes")}
        >
          <Tv size={13} />
          <span>New Episodes</span>
          <span className="notif-tab-count">{counts.episodes}</span>
        </button>
        <button
          className={`notif-tab ${activeTab === "releases" ? "active" : ""}`}
          onClick={() => setActiveTab("releases")}
        >
          <Sparkles size={13} />
          <span>New Releases</span>
          <span className="notif-tab-count">{counts.releases}</span>
        </button>
        <button
          className={`notif-tab ${activeTab === "upcoming" ? "active" : ""}`}
          onClick={() => setActiveTab("upcoming")}
        >
          <Clock size={13} />
          <span>Upcoming</span>
          <span className="notif-tab-count">{counts.upcoming}</span>
        </button>
      </div>

      {/* Notification List */}
      <div className="notif-list-container">
        {filteredNotifications.length === 0 ? (
          <div className="notif-empty-state">
            <div className="notif-empty-icon-wrap">
              <Sparkles size={28} />
            </div>
            <h4>No releases in this category</h4>
            <p>Check back soon for new anime episodes, movies, and schedule updates.</p>
          </div>
        ) : (
          filteredNotifications.map((item) => {
            const isRead = readIds.includes(String(item.id));
            const isUpcoming = item.category === "upcoming" || item.isUpcoming;
            const isEpisode = item.category === "episode";

            return (
              <div
                key={item.id}
                className={`notif-item ${isRead ? "read" : "unread"} ${isUpcoming ? "is-upcoming" : ""}`}
                onClick={() => handleItemClick(item)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && handleItemClick(item)}
              >
                {/* Poster Thumbnail */}
                <div className="notif-poster-wrapper">
                  <img
                    src={item.posterPath || "https://placehold.co/342x513/141722/a991ff?text=Anikai"}
                    alt={item.title}
                    className="notif-poster-img"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = "https://placehold.co/342x513/141722/a991ff?text=Anikai";
                    }}
                  />
                  <div className="notif-poster-overlay">
                    {isUpcoming ? <Clock size={16} /> : <Play size={16} fill="white" />}
                  </div>
                </div>

                {/* Content Area */}
                <div className="notif-content-area">
                  <div className="notif-top-row">
                    <span className={`notif-category-tag tag-${item.badgeType || item.category}`}>
                      {item.badgeText || item.categoryLabel}
                    </span>
                    <span className="notif-time-tag">
                      {isUpcoming && <Clock size={11} />}
                      {item.timeDisplay}
                    </span>
                  </div>

                  <h4 className="notif-item-title">{item.title}</h4>
                  <div className="notif-item-subtitle">{item.subtitle}</div>
                  <p className="notif-item-desc">{item.message}</p>
                </div>

                {/* Right Action / Indicator */}
                <div className="notif-action-col">
                  {!isRead && <span className="notif-unread-dot" title="Unread notification" />}
                  <div className="notif-arrow-btn">
                    <ChevronRight size={16} />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer link for dropdown mode */}
      {isDropdown && (
        <div className="notif-footer">
          <Link
            to="/notifications"
            className="notif-footer-link"
            onClick={() => onClose && onClose()}
          >
            <span>Open Notification Center</span>
            <ExternalLink size={13} />
          </Link>
        </div>
      )}
    </div>
  );
}
