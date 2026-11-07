-- Cinetrack — initial schema
-- Auto-runs on backend startup via db.Migrate()
-- Also runnable manually: psql $DATABASE_URL -f 001_init.sql

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
    id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    email         TEXT        UNIQUE NOT NULL,
    username      TEXT        UNIQUE NOT NULL,
    password_hash TEXT        NOT NULL,
    avatar_url    TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS media_items (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    tmdb_id         INTEGER,
    title           TEXT        NOT NULL,
    original_title  TEXT,
    media_type      TEXT        NOT NULL CHECK (media_type IN ('movie','series')),
    poster_path     TEXT,
    backdrop_path   TEXT,
    overview        TEXT,
    release_date    TEXT,
    genres          TEXT[],
    runtime_minutes INTEGER,
    total_seasons   INTEGER,
    total_episodes  INTEGER,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tmdb_id, media_type)
);

CREATE TABLE IF NOT EXISTS watchlist_entries (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID        NOT NULL REFERENCES users(id)       ON DELETE CASCADE,
    media_item_id   UUID        NOT NULL REFERENCES media_items(id) ON DELETE CASCADE,
    status          TEXT        NOT NULL CHECK (status IN ('plan_to_watch','watching','watched')),
    rating          INTEGER     CHECK (rating >= 1 AND rating <= 10),
    review_notes    TEXT,
    date_watched    DATE,
    current_season  INTEGER     DEFAULT 1,
    current_episode INTEGER     DEFAULT 1,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, media_item_id)
);

CREATE INDEX IF NOT EXISTS idx_watchlist_user   ON watchlist_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_status ON watchlist_entries(status);
CREATE INDEX IF NOT EXISTS idx_media_tmdb       ON media_items(tmdb_id);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated     ON users;
DROP TRIGGER IF EXISTS trg_watchlist_updated ON watchlist_entries;

CREATE TRIGGER trg_users_updated
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_watchlist_updated
    BEFORE UPDATE ON watchlist_entries
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
