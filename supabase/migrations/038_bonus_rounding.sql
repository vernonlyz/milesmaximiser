-- Bonus rounding grain (EXPERIMENTAL).
--
-- Some cards compute bonus on AGGREGATED eligible spend, not per transaction.
-- e.g. UOB Visa Signature / Lady's Solitaire:
--   sum all eligible spend (incl. cents) → round DOWN to nearest S$5 → ÷5 → ×9 UNI$
-- Summing per-transaction bonus (flooring each charge to $5) loses the cents on
-- every transaction and under-credits, so these cards need aggregate rounding.
--
--   per_transaction  — bonus floored per charge, then summed (default)
--   aggregate        — eligible spend summed first, floored once, then converted

ALTER TABLE card_library
  ADD COLUMN IF NOT EXISTS bonus_rounding TEXT NOT NULL DEFAULT 'per_transaction';

UPDATE card_library
  SET bonus_rounding = 'aggregate'
  WHERE bank = 'UOB'
    AND name IN ('Visa Signature', 'Lady''s Solitaire Card', 'Lady''s Card');
