# MovieVerse

A Vite + React movie/TV discovery and authorized-video playback starter.

## Run locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## TMDB

Copy `.env.example` to `.env` and set:

```env
APP_TMDB_API_KEY=your_key
```

Do not commit `.env`.

## Supabase authentication

This project includes an authentication-ready UI using Supabase Auth. Set:

```env
APP_SUPABASE_URL=...
APP_SUPABASE_PUBLISHABLE_KEY=...
```

Then enable Google, Discord and Facebook providers in the Supabase dashboard and configure each provider's OAuth credentials/redirect URI. Supabase documents these providers and callback setup.

## Video sources

`src/data/sources.js` is intentionally empty. Add only video sources you are authorized to distribute/stream. The player supports standard HTML5 video sources; HLS can be added with an HLS-compatible integration when needed.

## Vercel

This project includes `vercel.json` for SPA routing and is configured with:

- Build: `npm run build`
- Output: `dist`

Add the same public environment variables to Vercel before deploying.
