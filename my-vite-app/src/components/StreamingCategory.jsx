import React from "react";
import { STATUS_TYPES } from "../utils/releaseUtils";

/**
 * StreamingCategory Component
 * Renders an available category row (SUB / S-SUB / DUB) with the 3 canonical streaming providers:
 *   ● Vidplay
 *   ● BYFMS
 *   ● DGHG
 *
 * Only rendered when the category is actually AVAILABLE for the current content.
 */
export default function StreamingCategory({
  categoryKey = "sub",
  categoryLabel = "SUB",
  categoryConfig = null,
  activeCategoryKey = "sub",
  activeServerIndex = 0,
  activeServerId = null,
  onSelectCategory,
  onSelectServer,
}) {
  if (!categoryConfig) return null;

  const status = categoryConfig.status || STATUS_TYPES.AVAILABLE;
  // Strictly only display an audio/subtitle category when actually available
  if (status !== STATUS_TYPES.AVAILABLE) return null;

  const sources = categoryConfig.sources || [];
  if (sources.length === 0) return null;

  const isCategorySelected =
    activeCategoryKey.toLowerCase() === categoryKey.toLowerCase();

  return (
    <div
      className={`streaming-category-row ${
        isCategorySelected ? "category-active-row" : ""
      }`}
    >
      <div
        className="category-label-column"
        onClick={() => onSelectCategory && onSelectCategory(categoryKey)}
      >
        <span className="category-name-tag">{categoryLabel}</span>
      </div>

      <div
        className="category-servers-buttons"
        role="group"
        aria-label={`${categoryLabel} servers`}
      >
        {sources.map((srv, index) => {
          const srvBaseId = (srv.serverId || srv.provider || srv.id || "")
            .replace(/-sub$|-dub$|-ssub$/, "")
            .toLowerCase();
          const activeBaseId = (activeServerId || "")
            .replace(/-sub$|-dub$|-ssub$/, "")
            .toLowerCase();

          const isServerActive =
            isCategorySelected &&
            (activeBaseId
              ? srvBaseId === activeBaseId
              : activeServerIndex === index);

          let displayName = srv.name || "Server";
          if (srvBaseId === "videasy" || srvBaseId === "dghg") displayName = "Videasy Cloud";
          else if (srvBaseId === "vidlink" || srvBaseId === "vidplay") displayName = "VidLink Pro";
          else if (srvBaseId === "multiembed" || srvBaseId === "vidsrc-cc") displayName = "MultiEmbed VIP";
          else if (srvBaseId === "vidsrc" || srvBaseId === "byfms") displayName = "VidSrc Active";

          return (
            <button
              key={srv.id || `${categoryKey}-${index}`}
              type="button"
              className={`server-selector-btn ${
                isServerActive ? "server-btn-active" : ""
              }`}
              onClick={() => onSelectServer(categoryKey, index, srv)}
              title={`${displayName} · ${categoryLabel}`}
            >
              <span
                className={`server-bullet-dot ${
                  isServerActive ? "dot-active" : ""
                }`}
              />
              <span className="server-label-text">{displayName}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
