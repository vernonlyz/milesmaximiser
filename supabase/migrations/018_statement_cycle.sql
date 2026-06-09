-- Migration 018: Statement cycle support
--
-- Most SG credit cards reset bonus caps on the statement date, not the
-- calendar month. This migration adds two fields:
--
--   card_library.cap_cycle         — 'calendar' | 'statement'
--                                    'statement' = cap period resets on the user's
--                                    statement closing date, not the 1st of the month.
--
--   user_card_selections.statement_day — INTEGER 1–28
--                                    The day of month the user's statement closes
--                                    for this specific card. NULL = fall back to
--                                    calendar month (first of month).
--
-- All current library cards default to 'statement'. If a card genuinely resets
-- by calendar month, set cap_cycle = 'calendar' and the statement_day UI will
-- not appear for it.

ALTER TABLE card_library
  ADD COLUMN IF NOT EXISTS cap_cycle TEXT NOT NULL DEFAULT 'statement'
    CHECK (cap_cycle IN ('calendar', 'statement'));

ALTER TABLE user_card_selections
  ADD COLUMN IF NOT EXISTS statement_day INTEGER NULL
    CHECK (statement_day BETWEEN 1 AND 28);
