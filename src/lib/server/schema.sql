-- Chess Tournament Management System — PostgreSQL schema
-- Idempotent: safe to run repeatedly.

CREATE TABLE IF NOT EXISTS players (
    id          SERIAL PRIMARY KEY,
    name        TEXT NOT NULL,
    email       TEXT UNIQUE,
    rating      INTEGER NOT NULL DEFAULT 1200 CHECK (rating >= 0),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tournaments (
    id          SERIAL PRIMARY KEY,
    name        TEXT NOT NULL,
    location    TEXT,
    start_date  DATE,
    status      TEXT NOT NULL DEFAULT 'draft'
                CHECK (status IN ('draft', 'active', 'completed')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Many-to-many: which players are entered in which tournament.
CREATE TABLE IF NOT EXISTS tournament_players (
    tournament_id INTEGER NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    player_id     INTEGER NOT NULL REFERENCES players(id)     ON DELETE CASCADE,
    joined_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (tournament_id, player_id)
);

-- One row per match played in a tournament round.
-- result: 'player1' | 'player2' | 'draw' | 'bye'
-- winner_id is NULL for draws and byes.
CREATE TABLE IF NOT EXISTS matches (
    id            SERIAL PRIMARY KEY,
    tournament_id INTEGER NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    round         INTEGER NOT NULL DEFAULT 1,
    player1_id    INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    player2_id    INTEGER REFERENCES players(id) ON DELETE CASCADE,
    winner_id     INTEGER REFERENCES players(id) ON DELETE SET NULL,
    result        TEXT NOT NULL CHECK (result IN ('player1', 'player2', 'draw', 'bye')),
    played_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_matches_tournament ON matches(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tp_tournament ON tournament_players(tournament_id);
