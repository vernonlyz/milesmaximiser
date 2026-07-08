-- Effective-dated rate boost (replaces the boolean user_card_selections.rate_boost).
--
-- Each toggle is a dated row; the boost's state on any date = the most recent row
-- with effective_from <= that date. This mirrors user_category_overrides, so past
-- cycles reconcile against whether the boost was actually active then.

CREATE TABLE user_card_boosts (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_id        UUID NOT NULL,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  enabled        BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, card_id, effective_from)
);

ALTER TABLE user_card_boosts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users manage own card boosts"
  ON user_card_boosts FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Migrate any existing boolean toggles (enabled from today — adjust effective_from
-- to the real start date via the UI).
INSERT INTO user_card_boosts (user_id, card_id, effective_from, enabled)
SELECT user_id, card_id, CURRENT_DATE, true
FROM user_card_selections
WHERE rate_boost = true
ON CONFLICT DO NOTHING;

ALTER TABLE user_card_selections DROP COLUMN IF EXISTS rate_boost;
