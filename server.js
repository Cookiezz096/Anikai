/**
 * server.js — Anime Streaming Proxy Backend
 *
 * WHY this approach:
 * ─────────────────────────────────────────────────────────────────────────
 * @consumet/extensions v1.8.8 removed the Gogoanime class entirely.
 * The replacement Hianime provider returns HTTP 521 (Cloudflare block) and
 * its fetchEpisodeServers() method throws "Method not implemented."
 *
 * Solution: generate deterministic embed URLs from the same reliable
 * providers used by the React frontend (VidLink, VidSrc, AutoEmbed, EmbedSu).
 * These are public TMDB-based embed iframes — no scraping required.
 * ─────────────────────────────────────────────────────────────────────────
 */

import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3000;

// ── CORS: allow only the local Vite dev server ───────────────────────────────
app.use(cors({
  origin: 'http://localhost:5173',
  methods: ['GET', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
}));

app.use(express.json());

// ── Embed provider definitions ───────────────────────────────────────────────
// Each entry mirrors the SERVERS array in src/data/sources.js.
// Only WORKING providers with reliable uptime are included here.
const EMBED_PROVIDERS = [
  {
    name: 'VidLink',
    provider: 'vidlink',
    movie: (id)        => `https://vidlink.pro/movie/${id}`,
    tv:    (id, s, e)  => `https://vidlink.pro/tv/${id}/${s}/${e}`,
  },
  {
    name: 'VidSrc TO',
    provider: 'vidsrcto',
    movie: (id)        => `https://vidsrc.to/embed/movie/${id}`,
    tv:    (id, s, e)  => `https://vidsrc.to/embed/tv/${id}/${s}/${e}`,
  },
  {
    name: 'VidSrc ME',
    provider: 'vidsrcme',
    movie: (id)        => `https://vidsrc.me/embed/movie?tmdb=${id}`,
    tv:    (id, s, e)  => `https://vidsrc.me/embed/tv?tmdb=${id}&season=${s}&episode=${e}`,
  },
  {
    name: 'AutoEmbed',
    provider: 'autoembed',
    movie: (id)        => `https://player.autoembed.cc/embed/movie/${id}`,
    tv:    (id, s, e)  => `https://player.autoembed.cc/embed/tv/${id}/${s}/${e}`,
  },
  {
    name: 'EmbedSu',
    provider: 'embedsu',
    movie: (id)        => `https://embed.su/embed/movie/${id}`,
    tv:    (id, s, e)  => `https://embed.su/embed/tv/${id}/${s}/${e}`,
  },
  {
    name: 'Videasy',
    provider: 'videasy',
    movie: (id)        => `https://player.videasy.net/movie/${id}`,
    tv:    (id, s, e)  => `https://player.videasy.net/tv/${id}/${s}/${e}`,
  },
];

/**
 * Build the standardised server list payload for a given media item.
 * `mediaType` is 'movie' | 'tv'.
 */
function buildServerList(tmdbId, mediaType, season = 1, episode = 1) {
  return EMBED_PROVIDERS.map((p) => ({
    provider: p.provider,
    name: p.name,
    url: mediaType === 'tv'
      ? p.tv(tmdbId, season, episode)
      : p.movie(tmdbId),
  }));
}

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/', (_, res) => {
  res.json({ status: 'ok', message: 'Anime streaming proxy running', port: PORT });
});

// ── /api/servers/:tmdbId/:episodeNum  (used by WatchPage.jsx) ───────────────
// Defaults to TV/anime type; pass ?type=movie to switch.
app.get('/api/servers/:tmdbId/:episodeNum', (req, res) => {
  const { tmdbId, episodeNum } = req.params;
  const season    = Number(req.query.season)  || 1;
  const episode   = Number(episodeNum)         || 1;
  const mediaType = req.query.type            || 'tv';

  console.log(`[/api/servers] ${mediaType} tmdbId=${tmdbId} S${season}E${episode}`);
  res.json(buildServerList(tmdbId, mediaType, season, episode));
});

// ── /sources/:animeId/:season/:episode  (used by ServerPlayer.jsx) ──────────
app.get('/sources/:animeId/:season/:episode', (req, res) => {
  const { animeId, season, episode } = req.params;
  const mediaType = req.query.type || 'tv';

  console.log(`[/sources] ${mediaType} id=${animeId} S${season}E${episode}`);
  res.json(buildServerList(animeId, mediaType, Number(season), Number(episode)));
});

// ── /api/search/:query  (convenience — wraps TMDB via consumet META) ─────────
// Note: this is optional and can fail if the TMDB API key is missing.
app.get('/api/search/:query', async (req, res) => {
  try {
    const { ANIME } = await import('@consumet/extensions');
    // Use Hianime search as a best-effort fallback
    const inst    = new ANIME.Hianime();
    const results = await inst.search(req.params.query);
    res.json(results);
  } catch (e) {
    // Non-fatal — frontend falls back to TMDB direct search
    res.status(503).json({ error: 'Search unavailable', details: e.message });
  }
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 Streaming proxy active → http://localhost:${PORT}`);
  console.log(`   /api/servers/:tmdbId/:episode   — WatchPage.jsx compatible`);
  console.log(`   /sources/:id/:season/:episode   — ServerPlayer.jsx compatible`);
});
