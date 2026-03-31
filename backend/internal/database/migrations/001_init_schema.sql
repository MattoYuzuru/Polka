CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,
    nickname TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    display_name TEXT NOT NULL,
    tagline TEXT NOT NULL DEFAULT '',
    gradient_stops TEXT[] NOT NULL DEFAULT ARRAY['#101010', '#3563ff', '#ff7a51'],
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS books (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    author TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    year INTEGER NOT NULL CHECK (year >= 0),
    publisher TEXT NOT NULL DEFAULT '',
    age_rating TEXT NOT NULL DEFAULT '16+',
    genre TEXT NOT NULL,
    is_public BOOLEAN NOT NULL DEFAULT TRUE,
    status TEXT NOT NULL,
    rating INTEGER CHECK (rating BETWEEN 0 AND 10),
    opinion_preview TEXT NOT NULL DEFAULT '',
    cover_palette TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    rank_position INTEGER NOT NULL DEFAULT 999,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS recommendation_lists (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    books_count INTEGER NOT NULL DEFAULT 0,
    is_public BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_books_user_id_rank ON books(user_id, rank_position, created_at);
CREATE INDEX IF NOT EXISTS idx_books_user_id_visibility ON books(user_id, is_public);
CREATE INDEX IF NOT EXISTS idx_recommendation_lists_user_id_visibility
    ON recommendation_lists(user_id, is_public, updated_at DESC);
