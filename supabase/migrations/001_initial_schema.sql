-- MilesMaximiser initial schema
-- Run this in the Supabase SQL editor: Dashboard -> SQL Editor -> New query

-- ─────────────────────────────────────────────────────────────────────────────
-- Tables
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS categories (
  id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  icon TEXT NOT NULL DEFAULT '💳'
);

CREATE TABLE IF NOT EXISTS credit_cards (
  id           UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT    NOT NULL,
  bank         TEXT    NOT NULL,
  card_network TEXT    NOT NULL DEFAULT 'Visa',
  base_mpd     NUMERIC(5,2) NOT NULL DEFAULT 1.2,
  color        TEXT    NOT NULL DEFAULT '#4F46E5',
  active       BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Bonus earning rates per card per category
-- If a card has no row here for a given category, base_mpd applies
CREATE TABLE IF NOT EXISTS card_rates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id     UUID NOT NULL REFERENCES credit_cards(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id)  ON DELETE CASCADE,
  mpd         NUMERIC(5,2) NOT NULL,
  UNIQUE (card_id, category_id)
);

-- Spending caps for bonus earn rates
-- category_id NULL = global cap on all spend for that card
CREATE TABLE IF NOT EXISTS spending_caps (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id     UUID NOT NULL REFERENCES credit_cards(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  cap_period  TEXT NOT NULL CHECK (cap_period IN ('monthly','quarterly','annual','per_transaction')),
  spend_limit NUMERIC(10,2) NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transactions (
  id               UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id          UUID    REFERENCES credit_cards(id) ON DELETE SET NULL,
  category_id      UUID    REFERENCES categories(id)   ON DELETE SET NULL,
  amount           NUMERIC(10,2) NOT NULL,
  description      TEXT,
  transaction_date DATE    NOT NULL DEFAULT CURRENT_DATE,
  miles_earned     NUMERIC(10,2),
  effective_mpd    NUMERIC(5,2),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Indexes
-- ─────────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_transactions_date         ON transactions(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_card_cat     ON transactions(card_id, category_id);
CREATE INDEX IF NOT EXISTS idx_card_rates_card           ON card_rates(card_id);
CREATE INDEX IF NOT EXISTS idx_spending_caps_card        ON spending_caps(card_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Row Level Security (permissive for single-user personal app)
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE categories    ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_cards  ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_rates    ENABLE ROW LEVEL SECURITY;
ALTER TABLE spending_caps ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_all" ON categories    FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON credit_cards  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON card_rates    FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON spending_caps FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON transactions  FOR ALL USING (true) WITH CHECK (true);
