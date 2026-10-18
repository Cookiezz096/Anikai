import React from "react";
import { Server, RefreshCw, WifiOff } from "lucide-react";
import StreamingCategory from "./StreamingCategory";
import { STATUS_TYPES } from "../utils/releaseUtils";

/**
 * StreamingSources Component
 * Renders the AnimeKai-style streaming servers panel.
 * Only displays an audio/subtitle category (SUB, S-SUB, DUB) when that
 * option is ACTUALLY AVAILABLE for the current content.
 */
export default function StreamingSources({
  sourcesConfig = {},
  contentType = "movie",
  mediaContext = null,
  activeCategoryKey = "sub",
  activeServerIndex = 0,
  activeServerId = null,
  onSelectCategory,
  onSelectServer,
  onReloadStream,
}) {
  const isAvailable = (cat) => {
    if (!cat) return false;
    const status = cat.status || STATUS_TYPES.AVAILABLE;
    return (
      status === STATUS_TYPES.AVAILABLE &&
      Array.isArray(cat.sources) &&
      cat.sources.length > 0
    );
  };

  const subConfig = sourcesConfig?.sub;
  const ssubConfig = sourcesConfig?.ssub;
  const dubConfig = sourcesConfig?.dub;

  const hasSub = isAvailable(subConfig);
  const hasSsub = isAvailable(ssubConfig);
  const hasDub = isAvailable(dubConfig);

  if (!hasSub && !hasSsub && !hasDub) {
    return (
      <div className="server-panel empty">
        <WifiOff size={16} />
        <span>No streaming sources currently available for this title.</span>
      </div>
    );
  }

  return (
    <div className="server-panel animekai-server-panel">
      <div className="server-panel-header">
        <div className="server-header-title">
          <Server size={15} className="server-title-icon" />
          <span className="server-title-text">SERVERS</span>
        </div>

        <div className="server-header-actions">
          {onReloadStream && (
            <button
              type="button"
              className="server-quick-reload-btn"
              onClick={onReloadStream}
              title="Reload current stream"
            >
              <RefreshCw size={12} />
              <span>Reload</span>
            </button>
          )}
        </div>
      </div>

      <div className="streaming-categories-container">
        {hasSub && (
          <StreamingCategory
            categoryKey="sub"
            categoryLabel="SUB"
            categoryConfig={subConfig}
            activeCategoryKey={activeCategoryKey}
            activeServerIndex={activeServerIndex}
            activeServerId={activeServerId}
            onSelectCategory={onSelectCategory}
            onSelectServer={onSelectServer}
          />
        )}

        {hasSsub && (
          <StreamingCategory
            categoryKey="ssub"
            categoryLabel="S-SUB"
            categoryConfig={ssubConfig}
            activeCategoryKey={activeCategoryKey}
            activeServerIndex={activeServerIndex}
            activeServerId={activeServerId}
            onSelectCategory={onSelectCategory}
            onSelectServer={onSelectServer}
          />
        )}

        {hasDub && (
          <StreamingCategory
            categoryKey="dub"
            categoryLabel="DUB"
            categoryConfig={dubConfig}
            activeCategoryKey={activeCategoryKey}
            activeServerIndex={activeServerIndex}
            activeServerId={activeServerId}
            onSelectCategory={onSelectCategory}
            onSelectServer={onSelectServer}
          />
        )}
      </div>
    </div>
  );
}
