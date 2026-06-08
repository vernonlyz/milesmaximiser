-- MilesMaximiser — per-user selectable bonus categories
-- Handles cards like UOB Lady's Card where the cardholder chooses their bonus category
-- at account opening and can change it by calling the bank.
--
-- Design: the library keeps a single "bonus slot" rate row per selectable card (e.g. Dining 4mpd).
-- The engine substitutes the user's chosen category into that slot at query time.
-- Overrides carry effective_from so history is preserved when the choice changes.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Mark selectable cards in the library
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE card_library ADD COLUMN IF NOT EXISTS selectable_category BOOLEAN NOT NULL DEFAULT FALSE;
-- max_selectable: how many bonus categories the cardholder may choose (1 for Lady's Card, 2 for Solitaire)
ALTER TABLE card_library ADD COLUMN IF NOT EXISTS max_selectable INT NOT NULL DEFAULT 1;

UPDATE card_library SET selectable_category = TRUE, max_selectable = 1
WHERE id = '00000000-0000-0000-0001-000000000010';  -- UOB Lady's Card

UPDATE card_library SET selectable_category = TRUE, max_selectable = 2
WHERE id = '00000000-0000-0000-0001-000000000011';  -- UOB Lady's Solitaire Card

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Add missing spend categories
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO categories (id, name, icon) VALUES
  ('00000000-0000-0000-0000-000000000009', 'Fashion',      '👗'),
  ('00000000-0000-0000-0000-000000000010', 'Beauty',       '💄')
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Valid choices per selectable card (admin-managed, read-only for users)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS library_selectable_categories (
  card_id     UUID NOT NULL REFERENCES card_library(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id)   ON DELETE CASCADE,
  PRIMARY KEY (card_id, category_id)
);

ALTER TABLE library_selectable_categories ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "auth_read" ON library_selectable_categories FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- UOB Lady's Card eligible categories
INSERT INTO library_selectable_categories (card_id, category_id) VALUES
  ('00000000-0000-0000-0001-000000000010', '00000000-0000-0000-0000-000000000001'),  -- Dining
  ('00000000-0000-0000-0001-000000000010', '00000000-0000-0000-0000-000000000009'),  -- Fashion
  ('00000000-0000-0000-0001-000000000010', '00000000-0000-0000-0000-000000000010'),  -- Beauty
  ('00000000-0000-0000-0001-000000000010', '00000000-0000-0000-0000-000000000007'),  -- Entertainment
  ('00000000-0000-0000-0001-000000000010', '00000000-0000-0000-0000-000000000006'),  -- Travel
  ('00000000-0000-0000-0001-000000000010', '00000000-0000-0000-0000-000000000008'),  -- Transport
-- UOB Lady's Solitaire eligible categories (same menu)
  ('00000000-0000-0000-0001-000000000011', '00000000-0000-0000-0000-000000000001'),  -- Dining
  ('00000000-0000-0000-0001-000000000011', '00000000-0000-0000-0000-000000000009'),  -- Fashion
  ('00000000-0000-0000-0001-000000000011', '00000000-0000-0000-0000-000000000010'),  -- Beauty
  ('00000000-0000-0000-0001-000000000011', '00000000-0000-0000-0000-000000000007'),  -- Entertainment
  ('00000000-0000-0000-0001-000000000011', '00000000-0000-0000-0000-000000000006'),  -- Travel
  ('00000000-0000-0000-0001-000000000011', '00000000-0000-0000-0000-000000000008')   -- Transport
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Per-user category overrides with history
-- ─────────────────────────────────────────────────────────────────────────────

-- category_ids is an array so Lady's Solitaire (2-category choice) is supported
-- without a schema change. Current seeding only uses 1 slot per card.
CREATE TABLE IF NOT EXISTS user_category_overrides (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        NOT NULL REFERENCES auth.users(id)   ON DELETE CASCADE,
  card_id        UUID        NOT NULL REFERENCES card_library(id) ON DELETE CASCADE,
  category_ids   UUID[]      NOT NULL,
  effective_from DATE        NOT NULL DEFAULT CURRENT_DATE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, card_id, effective_from)
);

ALTER TABLE user_category_overrides ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "user_own" ON user_category_overrides FOR ALL TO authenticated
    USING     (user_id = auth.uid())
    WITH CHECK(user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_cat_overrides
  ON user_category_overrides(user_id, card_id, effective_from DESC);
