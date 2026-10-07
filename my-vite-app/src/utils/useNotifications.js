import { useState, useEffect, useCallback } from "react";
import {
  getReleaseNotifications,
  getReadNotificationIds,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "./notificationService";

export function useNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [readIds, setReadIds] = useState(() => getReadNotificationIds());
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async (force = false) => {
    try {
      const list = await getReleaseNotifications(force);
      setNotifications(list);
    } catch (err) {
      console.warn("Failed fetching notifications:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();

    // Listen for cross-component read updates
    function handleUpdate(e) {
      if (e.detail?.readList) {
        setReadIds(e.detail.readList);
      } else {
        setReadIds(getReadNotificationIds());
      }
    }

    window.addEventListener("anikai_notifications_updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);

    return () => {
      window.removeEventListener("anikai_notifications_updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, [refresh]);

  const markAsRead = useCallback((id) => {
    markNotificationAsRead(id);
    setReadIds((prev) => (prev.includes(String(id)) ? prev : [...prev, String(id)]));
  }, []);

  const markAllRead = useCallback(() => {
    const allIds = notifications.map((n) => n.id);
    markAllNotificationsAsRead(allIds);
    setReadIds(allIds);
  }, [notifications]);

  const unreadCount = notifications.filter((n) => !readIds.includes(String(n.id))).length;

  return {
    notifications,
    readIds,
    unreadCount,
    loading,
    refresh,
    markAsRead,
    markAllRead,
  };
}
