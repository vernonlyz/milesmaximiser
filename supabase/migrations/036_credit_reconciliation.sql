-- Credit-timing reconciliation (EXPERIMENTAL, admin-gated in the UI).
--
-- Banks credit base and bonus miles/points on different schedules. This lets the
-- user reconcile EXPECTED base/bonus (derived from transactions) against what the
-- bank actually credited, per crediting cycle.
--
-- Per-card crediting rule:
--   base_timing        'on_post' | 'statement_close'
--   bonus_timing       'on_post' | 'statement_close' | 'next_calendar_month' | 'quarter_end'
--   bonus_by_category  bonus credited as a per-category lump (e.g. UOB programme cards)
--
-- Examples:
--   UOB Preferred Platinum — base + bonus 'on_post'
--   UOB Lady's / Solitaire — base 'on_post', bonus 'next_calendar_month', by category

ALTER TABLE card_library
  ADD COLUMN IF NOT EXISTS base_timing       TEXT    NOT NULL DEFAULT 'on_post',
  ADD COLUMN IF NOT EXISTS bonus_timing      TEXT    NOT NULL DEFAULT 'on_post',
  ADD COLUMN IF NOT EXISTS bonus_by_category BOOLEAN NOT NULL DEFAULT false;

-- UOB programme cards: bonus credited at the start of the next calendar month,
-- split by category. (Indicative — verify per card.)
UPDATE card_library
  SET bonus_timing = 'next_calendar_month', bonus_by_category = true
  WHERE name IN ('Lady''s Card', 'Lady''s Solitaire Card');

-- Per-user reconciliation of a single credit event. Expected is always recomputed
-- from transactions; only the actual/reconciled/note are persisted.
CREATE TABLE credit_reconciliations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_id       UUID NOT NULL,
  kind          TEXT NOT NULL,          -- 'base' | 'bonus'
  cycle_month   DATE NOT NULL,          -- first day of the spend month, e.g. 2026-06-01
  category_id   UUID,                   -- only for by-category bonus, else NULL
  actual_points NUMERIC,
  actual_miles  NUMERIC,
  reconciled    BOOLEAN NOT NULL DEFAULT false,
  note          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One reconciliation row per credit event (NULL category treated as one bucket).
CREATE UNIQUE INDEX credit_recon_uniq ON credit_reconciliations
  (user_id, card_id, kind, cycle_month, COALESCE(category_id, '00000000-0000-0000-0000-000000000000'::uuid));

ALTER TABLE credit_reconciliations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users manage own credit reconciliations"
  ON credit_reconciliations FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
