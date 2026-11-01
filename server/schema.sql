CREATE TABLE IF NOT EXISTS cards (
  id                  SERIAL PRIMARY KEY,
  player              TEXT NOT NULL,
  year                INTEGER,
  brand               TEXT,            -- Topps, Panini, Bowman...
  set_name            TEXT,            -- Chrome, Prizm, Select...
  card_number         TEXT,
  parallel            TEXT,            -- Purple Refractor, Silver...
  serial_number       TEXT,            -- e.g. 12/75
  sport               TEXT,
  grade               TEXT,            -- Raw, PSA 10, BGS 9.5...
  quantity            INTEGER NOT NULL DEFAULT 1,
  purchase_price      NUMERIC(10, 2),
  current_price       NUMERIC(10, 2),
  price_updated_at    TIMESTAMPTZ,
  location            TEXT,            -- which box / binder it is physically in
  personal_collection BOOLEAN NOT NULL DEFAULT false,  -- PC cards never trigger sell alerts
  alert_threshold_pct NUMERIC(6, 2),   -- per-card override of ALERT_THRESHOLD_PCT
  photo_path          TEXT,
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cards_player_idx ON cards (lower(player));

CREATE TABLE IF NOT EXISTS price_history (
  id          SERIAL PRIMARY KEY,
  card_id     INTEGER NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  price       NUMERIC(10, 2) NOT NULL,
  source      TEXT NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS price_history_card_idx ON price_history (card_id, recorded_at);

CREATE TABLE IF NOT EXISTS alerts (
  id         SERIAL PRIMARY KEY,
  card_id    INTEGER NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  old_price  NUMERIC(10, 2) NOT NULL,
  new_price  NUMERIC(10, 2) NOT NULL,
  pct_change NUMERIC(8, 2) NOT NULL,
  read       BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id         SERIAL PRIMARY KEY,
  endpoint   TEXT NOT NULL UNIQUE,
  keys       JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
