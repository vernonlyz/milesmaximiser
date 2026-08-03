-- Rename UOB "Preferred Platinum Visa" → "Preferred Visa" (card ...013).
-- Display-only; all rates/caps/MCC eligibility are keyed by card id, so nothing
-- else changes. (Historical migrations 053 reference the old name but match by
-- name on cards that don't exist yet at migration time — the app sets mcc_mode by
-- id via library_seed — so this rename has no functional impact.)
UPDATE card_library SET name = 'Preferred Visa'
  WHERE id = '00000000-0000-0000-0001-000000000013';
