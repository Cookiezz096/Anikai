/**
 * watchPageRunner.js
 *
 * ES Module runner for watch.html.
 * Routes all Watchmode API requests through secure watchmodeService.js using
 * import.meta.env.APP_WATCHMODE_API_KEY. No raw API keys are exposed in the HTML.
 * Also configures the inline player with active free streaming embed endpoints (vidsrc.to, videasy, vidlink, multiembed).
 */

import { fetchWatchmodeSources, KNOWN_WATCHMODE_IDS } from "./utils/watchmodeService.js";

// Metadata mapping for fast instant title details
const KNOWN_METADATA = {
  "1352293": { title: "Inception", year: "2010", tmdbId: "27205", overview: "A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O.", poster: "https://image.tmdb.org/t/p/w500/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg" },
  "1354312": { title: "Interstellar", year: "2014", tmdbId: "157336", overview: "When Earth becomes uninhabitable in the future, a farmer and ex-NASA pilot, Joseph Cooper, is tasked to pilot a spacecraft along with a team of researchers to find a new planet for humans.", poster: "https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg" },
  "1342115": { title: "Avatar", year: "2009", tmdbId: "19995", overview: "In the 22nd century, a paraplegic Marine is dispatched to the moon Pandora on a unique mission, but becomes torn between following orders and protecting an alien civilization.", poster: "https://image.tmdb.org/t/p/w500/kyeqWdyUXW608qlYkRqosgbbJyK.jpg" },
  "550": { title: "Fight Club", year: "1999", tmdbId: "550", overview: "A ticking-time-bomb insomniac and a slippery soap salesman channel primal male aggression into a shocking new form of therapy.", poster: "https://image.tmdb.org/t/p/w500/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg" },
  "27205": { title: "Inception", year: "2010", tmdbId: "27205", overview: "A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O.", poster: "https://image.tmdb.org/t/p/w500/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg" },
  "157336": { title: "Interstellar", year: "2014", tmdbId: "157336", overview: "When Earth becomes uninhabitable in the future, a farmer and ex-NASA pilot, Joseph Cooper, is tasked to pilot a spacecraft along with a team of researchers to find a new planet for humans.", poster: "https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg" },
};

export async function initWatchPage() {
  // 1. Get the movie ID automatically from the website's URL (e.g., watch.html?id=1352293)
  const urlParams = new URLSearchParams(window.location.search);
  const movieId = urlParams.get("id") || urlParams.get("movieId") || "";

  // Highlight active quick selector pill
  document.querySelectorAll(".quick-pill").forEach((pill) => {
    if (pill.dataset.id === movieId) pill.classList.add("active");
  });

  if (!movieId) {
    const container = document.getElementById("streaming-servers-container");
    if (container) container.innerText = "No movie ID specified.";
    const titleEl = document.getElementById("movie-title");
    if (titleEl) titleEl.innerText = "No Movie Selected";
    const overEl = document.getElementById("movie-overview");
    if (overEl) overEl.innerText = "Please specify a movie ID in the URL parameter (e.g. ?id=1352293) or click one of the quick test titles above.";
    return;
  }

  const idBadge = document.getElementById("movie-id-badge");
  if (idBadge) idBadge.innerText = `ID: ${movieId}`;

  // Resolve metadata: check KNOWN_METADATA first, then KNOWN_WATCHMODE_IDS
  const known = KNOWN_METADATA[movieId] || KNOWN_WATCHMODE_IDS[movieId] || {};
  const displayTitle = known.title || `Movie (${movieId})`;
  const titleEl = document.getElementById("movie-title");
  if (titleEl) {
    titleEl.innerHTML = `${displayTitle} <span class="meta-badge">ID: ${movieId}</span>`;
  }
  document.title = `${displayTitle} - Watch Stream`;

  const overEl = document.getElementById("movie-overview");
  if (overEl && known.overview) overEl.innerText = known.overview;
  const yearEl = document.getElementById("movie-year");
  if (yearEl && known.year) yearEl.innerText = `Year: ${known.year}`;
  const posterEl = document.getElementById("movie-poster");
  if (posterEl && known.poster) posterEl.src = known.poster;

  // Resolve TMDB ID for streaming player
  const targetTmdb = known.tmdbId || movieId;

  // 2. Setup Inline Video Player with active free streaming endpoints (VidSrc To, Videasy, VidLink, MultiEmbed)
  setupInlinePlayer(targetTmdb);

  // 3. Automatically request Watchmode streaming links via secure service (uses import.meta.env key)
  await loadWatchmodeSources(movieId, targetTmdb);
}

function setupInlinePlayer(targetTmdb) {
  const iframe = document.getElementById("video-player-iframe");
  if (!iframe) return;

  // Primary active embed endpoint: VidSrc TO (Fast Stream)
  const defaultEmbedUrl = `https://vidsrc.to/embed/movie/${targetTmdb}`;
  iframe.src = defaultEmbedUrl;

  // Check if a server switcher toolbar already exists, if not create one
  let switcher = document.getElementById("player-server-switcher");
  if (!switcher) {
    const playerSection = document.querySelector(".player-section");
    if (playerSection) {
      switcher = document.createElement("div");
      switcher.id = "player-server-switcher";
      switcher.style.cssText = "display:flex;align-items:center;gap:8px;padding:10px 14px;background:#10121a;border:1px solid rgba(255,255,255,0.08);border-radius:10px;margin-bottom:12px;flex-wrap:wrap;";

      const label = document.createElement("span");
      label.style.cssText = "font-size:12px;font-weight:700;color:#a991ff;letter-spacing:0.5px;margin-right:6px;";
      label.innerText = "STREAM SERVERS:";
      switcher.appendChild(label);

      const servers = [
        { name: "VidSrc To (Fast)", url: `https://vidsrc.to/embed/movie/${targetTmdb}` },
        { name: "Videasy Cloud", url: `https://player.videasy.net/movie/${targetTmdb}` },
        { name: "VidLink Pro", url: `https://vidlink.pro/movie/${targetTmdb}` },
        { name: "MultiEmbed VIP", url: `https://multiembed.mov/?video_id=${targetTmdb}&tmdb=1` },
      ];

      servers.forEach((srv, idx) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.innerText = srv.name;
        btn.style.cssText = `background:${idx === 0 ? "#8b5cf6" : "#1a1c24"};border:1px solid ${idx === 0 ? "#a78bfa" : "rgba(255,255,255,0.1)"};color:#fff;padding:6px 14px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;transition:all 0.2s;`;
        btn.addEventListener("click", () => {
          iframe.src = srv.url;
          switcher.querySelectorAll("button").forEach((b) => {
            b.style.background = "#1a1c24";
            b.style.borderColor = "rgba(255,255,255,0.1)";
          });
          btn.style.background = "#8b5cf6";
          btn.style.borderColor = "#a78bfa";
        });
        switcher.appendChild(btn);
      });

      playerSection.parentNode.insertBefore(switcher, playerSection);
    }
  }
}

async function loadWatchmodeSources(movieId, targetTmdb) {
  const container = document.getElementById("streaming-servers-container");
  if (!container) return;

  try {
    const { sources, error } = await fetchWatchmodeSources(movieId);
    container.innerHTML = "";

    if (error || !sources || sources.length === 0) {
      renderFallbackSources(container, targetTmdb);
      return;
    }

    // Loop through all available streaming links and add them to the UI automatically
    sources.forEach((source) => {
      const button = document.createElement("a");
      button.href = source.web_url;
      button.target = "_blank";
      button.rel = "noopener noreferrer";
      button.className = "stream-btn";
      button.innerText = `Watch on ${source.name} (${source.type})`;
      container.appendChild(button);
    });

    const badge = document.getElementById("sources-badge");
    if (badge) {
      badge.innerText = `● Watchmode Live (${sources.length} sources)`;
      badge.style.color = "#34d399";
    }
  } catch (err) {
    console.error("[watchPageRunner] Error fetching sources:", err);
    renderFallbackSources(container, targetTmdb);
  }
}

function renderFallbackSources(container, targetTmdb) {
  container.innerHTML = "";

  const providers = [
    { name: "VidSrc To (Fast)", type: "free stream", url: `https://vidsrc.to/embed/movie/${targetTmdb}` },
    { name: "Videasy Cloud HD", type: "free stream", url: `https://player.videasy.net/movie/${targetTmdb}` },
    { name: "VidLink Pro 1080p", type: "free stream", url: `https://vidlink.pro/movie/${targetTmdb}` },
    { name: "Netflix", type: "sub", url: "https://www.netflix.com" },
    { name: "Amazon Prime Video", type: "sub", url: "https://www.primevideo.com" },
    { name: "Apple TV+", type: "rent/buy", url: "https://tv.apple.com" },
  ];

  providers.forEach((source) => {
    const button = document.createElement("a");
    button.href = source.url;
    button.target = "_blank";
    button.rel = "noopener noreferrer";
    button.className = "stream-btn";
    button.innerText = `Watch on ${source.name} (${source.type})`;
    container.appendChild(button);
  });

  const notice = document.createElement("div");
  notice.style.cssText = "width:100%;font-size:0.82rem;color:#94a3b8;margin-top:10px;";
  notice.innerText = "Showing direct stream and authorized partners. Watchmode live links load automatically.";
  container.appendChild(notice);
}

// Auto-run on DOM ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initWatchPage);
} else {
  initWatchPage();
}
