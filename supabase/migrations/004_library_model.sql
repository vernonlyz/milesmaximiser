-- MilesMaximiser — centralised card library model
-- Run this AFTER 003_add_effective_from.sql.
--
-- What this does:
--   1. Creates card_library, library_rates, library_caps (admin-managed, read-only for users)
--   2. Creates user_card_selections (which library cards each user has in their wallet)
--   3. Rewires transactions.card_id → card_library
--   4. Drops the old per-user credit_cards / card_rates / spending_caps tables
--
-- NOTE: All existing transactions and card data are cleared.
--       After running this, seed the library via library_seed.sql,
--       then users re-select their cards on next login.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. New library tables
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE card_library (
  id           UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT    NOT NULL,
  bank         TEXT    NOT NULL,
  card_network TEXT    NOT NULL DEFAULT 'Visa',
  base_mpd     NUMERIC(5,2) NOT NULL DEFAULT 1.2,
  color        TEXT    NOT NULL DEFAULT '#4F46E5',
  active       BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE library_rates (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id        UUID NOT NULL REFERENCES card_library(id) ON DELETE CASCADE,
  category_id    UUID NOT NULL REFERENCES categories(id)  ON DELETE CASCADE,
  mpd            NUMERIC(5,2) NOT NULL,
  effective_from DATE NOT NULL,
  UNIQUE (card_id, category_id, effective_from)
);

CREATE TABLE library_caps (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id        UUID NOT NULL REFERENCES card_library(id) ON DELETE CASCADE,
  category_id    UUID REFERENCES categories(id) ON DELETE CASCADE,
  cap_period     TEXT NOT NULL CHECK (cap_period IN ('monthly','quarterly','annual','per_transaction')),
  spend_limit    NUMERIC(10,2),   -- NULL = cap removed from this date onward
  effective_from DATE NOT NULL
);

CREATE TABLE user_card_selections (
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_id    UUID NOT NULL REFERENCES card_library(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, card_id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Indexes
-- ─────────────────────────────────────────────────────────────────────────────

CREATE INDEX idx_library_rates_eff ON library_rates(card_id, category_id, effective_from DESC);
CREATE INDEX idx_library_caps_eff  ON library_caps(card_id, category_id, effective_from DESC);
CREATE INDEX idx_user_card_sel     ON user_card_selections(user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. RLS — library is read-only for all authenticated users;
--          write access is via Supabase Dashboard (service role) only.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE card_library          ENABLE ROW LEVEL SECURITY;
ALTER TABLE library_rates         ENABLE ROW LEVEL SECURITY;
ALTER TABLE library_caps          ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_card_selections  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_read" ON card_library  FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read" ON library_rates FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read" ON library_caps  FOR SELECT TO authenticated USING (true);

CREATE POLICY "user_own" ON user_card_selections FOR ALL TO authenticated
  USING     (user_id = auth.uid())
  WITH CHECK(user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Clear existing user data and rewire transactions
-- ─────────────────────────────────────────────────────────────────────────────

-- Truncate clears all per-user card data and transactions
TRUNCATE transactions RESTART IDENTITY CASCADE;

-- Drop FK so we can rewire it
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_card_id_fkey;

-- Drop old tables (data already cleared)
DROP TABLE IF EXISTS spending_caps CASCADE;
DROP TABLE IF EXISTS card_rates    CASCADE;
DROP TABLE IF EXISTS credit_cards  CASCADE;

-- New FK: transactions.card_id → card_library
ALTER TABLE transactions
  ADD CONSTRAINT transactions_card_id_fkey
  FOREIGN KEY (card_id) REFERENCES card_library(id) ON DELETE SET NULL;
