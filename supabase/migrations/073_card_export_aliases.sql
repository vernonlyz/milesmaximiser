-- Per-user card-name aliases for the Admin CSV export. A transaction's "Card Used"
-- column is exported as the alias for (card_id, category_id), falling back to the
-- card-level alias (category_id NULL), then the real "Bank Name".
--   category_id NULL      → default alias for the card
--   category_id set       → category-specific alias (e.g. UOB Lady's Solitaire:
--                            Dining → "UOB Ladys", Fashion → "UOB Ladys - Shopping")
CREATE TABLE IF NOT EXISTS card_export_aliases (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL,
  card_id     UUID NOT NULL,
  category_id UUID,
  alias       TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One default (NULL-category) alias and one per category, per card, per user.
CREATE UNIQUE INDEX IF NOT EXISTS card_export_aliases_default_uq
  ON card_export_aliases (user_id, card_id) WHERE category_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS card_export_aliases_cat_uq
  ON card_export_aliases (user_id, card_id, category_id) WHERE category_id IS NOT NULL;

ALTER TABLE card_export_aliases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own export aliases" ON card_export_aliases;
CREATE POLICY "own export aliases" ON card_export_aliases
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
