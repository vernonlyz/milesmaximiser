-- MilesMaximiser — add effective_from to card_rates and spending_caps
-- Run this AFTER 002_add_auth.sql in the Supabase SQL editor.

-- ─────────────────────────────────────────────────────────────────────────────
-- card_rates
-- ─────────────────────────────────────────────────────────────────────────────

-- Add effective_from column
ALTER TABLE card_rates ADD COLUMN effective_from DATE NOT NULL DEFAULT '2000-01-01';

-- Drop old unique constraint (card_id, category_id) — there can now be multiple
-- rows per card+category, one per effective date
ALTER TABLE card_rates DROP CONSTRAINT IF EXISTS card_rates_card_id_category_id_key;

-- New unique constraint includes effective_from
ALTER TABLE card_rates ADD CONSTRAINT card_rates_card_id_category_id_effective_from_key
  UNIQUE (card_id, category_id, effective_from);

-- Index for fast "latest effective rate" lookups
CREATE INDEX IF NOT EXISTS idx_card_rates_eff
  ON card_rates (card_id, category_id, effective_from DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- spending_caps
-- ─────────────────────────────────────────────────────────────────────────────

-- Add effective_from column
ALTER TABLE spending_caps ADD COLUMN effective_from DATE NOT NULL DEFAULT '2000-01-01';

-- spend_limit NULL means the cap was REMOVED from this effective date onward
ALTER TABLE spending_caps ALTER COLUMN spend_limit DROP NOT NULL;

-- Index for fast "latest effective cap" lookups
CREATE INDEX IF NOT EXISTS idx_spending_caps_eff
  ON spending_caps (card_id, category_id, cap_period, effective_from DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- Remove column defaults (effective_from must always be supplied explicitly)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE card_rates    ALTER COLUMN effective_from DROP DEFAULT;
ALTER TABLE spending_caps ALTER COLUMN effective_from DROP DEFAULT;
