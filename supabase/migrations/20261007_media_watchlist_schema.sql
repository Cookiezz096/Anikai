-- ==============================================================================
-- SUPABASE POSTGRESQL SCHEMA: POLYMORPHIC MEDIA WATCHLIST & TRACKING ENGINE
-- Supports Movies, TV Shows, and Anime using TMDB and AniList identifier mappings.
-- ==============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. MEDIA CATALOG (Unified Polymorphic Media Cache)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.media_catalog (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    media_type VARCHAR(20) NOT NULL CHECK (media_type IN ('movie', 'tv', 'anime')),
    tmdb_id INTEGER NULL,
    anilist_id INTEGER NULL,
    imdb_id VARCHAR(30) NULL,
    title VARCHAR(255) NOT NULL,
    original_title VARCHAR(255) NULL,
    poster_path TEXT NULL,
    backdrop_path TEXT NULL,
    release_year INTEGER NULL,
    overview TEXT NULL,
    genres JSONB DEFAULT '[]'::jsonb,
    total_episodes INTEGER NULL,
    total_seasons INTEGER NULL,
    vote_average NUMERIC(3, 1) NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,

    -- Unique indexes ensure no duplicate catalog entries per provider ID
    CONSTRAINT unique_tmdb_media UNIQUE (media_type, tmdb_id),
    CONSTRAINT unique_anilist_media UNIQUE (media_type, anilist_id)
);

-- Indexing for rapid queries
CREATE INDEX IF NOT EXISTS idx_media_catalog_tmdb ON public.media_catalog (tmdb_id);
CREATE INDEX IF NOT EXISTS idx_media_catalog_anilist ON public.media_catalog (anilist_id);
CREATE INDEX IF NOT EXISTS idx_media_catalog_type ON public.media_catalog (media_type);

-- ------------------------------------------------------------------------------
-- 2. USER WATCHLISTS & PROGRESS TRACKING
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_watchlists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    media_id UUID NOT NULL REFERENCES public.media_catalog(id) ON DELETE CASCADE,
    status VARCHAR(30) NOT NULL DEFAULT 'plan_to_watch' 
        CHECK (status IN ('plan_to_watch', 'watching', 'completed', 'on_hold', 'dropped')),
    user_score NUMERIC(3, 1) NULL CHECK (user_score >= 0 AND user_score <= 10),
    episodes_watched INTEGER NOT NULL DEFAULT 0 CHECK (episodes_watched >= 0),
    seasons_watched INTEGER NOT NULL DEFAULT 0 CHECK (seasons_watched >= 0),
    is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
    notes TEXT NULL,
    last_watched_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,

    -- A user can track each media item once
    CONSTRAINT unique_user_media_entry UNIQUE (user_id, media_id)
);

-- Indexing for user querying performance
CREATE INDEX IF NOT EXISTS idx_user_watchlists_user_id ON public.user_watchlists (user_id);
CREATE INDEX IF NOT EXISTS idx_user_watchlists_status ON public.user_watchlists (user_id, status);
CREATE INDEX IF NOT EXISTS idx_user_watchlists_favorites ON public.user_watchlists (user_id, is_favorite);

-- ------------------------------------------------------------------------------
-- 3. USER WATCH PROVIDER PREFERENCES (Region & Streaming Subscriptions)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_provider_preferences (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    country_code VARCHAR(5) NOT NULL DEFAULT 'US',
    subscribed_providers JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ------------------------------------------------------------------------------
-- 4. AUTOMATIC TIMESTAMP TRIGGER
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_media_catalog_updated_at ON public.media_catalog;
CREATE TRIGGER set_media_catalog_updated_at
    BEFORE UPDATE ON public.media_catalog
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_user_watchlists_updated_at ON public.user_watchlists;
CREATE TRIGGER set_user_watchlists_updated_at
    BEFORE UPDATE ON public.user_watchlists
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_user_provider_preferences_updated_at ON public.user_provider_preferences;
CREATE TRIGGER set_user_provider_preferences_updated_at
    BEFORE UPDATE ON public.user_provider_preferences
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- ------------------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE public.media_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_watchlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_provider_preferences ENABLE ROW LEVEL SECURITY;

-- Media Catalog: readable by everyone, insertable/updatable by authenticated users
CREATE POLICY "Public media items are readable by all"
    ON public.media_catalog FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can insert media items"
    ON public.media_catalog FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated users can update media items"
    ON public.media_catalog FOR UPDATE
    TO authenticated
    USING (true);

-- User Watchlists: strict user ownership
CREATE POLICY "Users can view own watchlist"
    ON public.user_watchlists FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert items into own watchlist"
    ON public.user_watchlists FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update items in own watchlist"
    ON public.user_watchlists FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can remove items from own watchlist"
    ON public.user_watchlists FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- User Provider Preferences: strict user ownership
CREATE POLICY "Users can view and manage their own provider preferences"
    ON public.user_provider_preferences FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 6. CONVENIENCE VIEW: UNIFIED USER WATCHLIST WITH FULL MEDIA METADATA
-- ------------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.user_watchlist_detailed AS
SELECT 
    w.id AS watchlist_id,
    w.user_id,
    w.status,
    w.user_score,
    w.episodes_watched,
    w.seasons_watched,
    w.is_favorite,
    w.notes,
    w.last_watched_at,
    w.updated_at AS list_updated_at,
    m.id AS media_id,
    m.media_type,
    m.tmdb_id,
    m.anilist_id,
    m.imdb_id,
    m.title,
    m.original_title,
    m.poster_path,
    m.backdrop_path,
    m.release_year,
    m.overview,
    m.genres,
    m.total_episodes,
    m.total_seasons,
    m.vote_average,
    m.metadata
FROM public.user_watchlists w
JOIN public.media_catalog m ON w.media_id = m.id;
