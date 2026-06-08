-- MilesMaximiser — add Fashion (011) and Beauty (012) categories; fix all references
--
-- Root cause: migration 005 tried to insert Fashion at id 009 with ON CONFLICT DO NOTHING,
-- but 009 was already "Utilities & Bills" from the initial seed. Fashion and Beauty were
-- silently skipped. This migration adds them at new IDs (011, 012) and fixes every
-- place that mistakenly referenced 009/010 expecting Fashion/Beauty.
--
-- Changes:
--   - Add Fashion (011) and Beauty (012) categories
--   - Fix library_selectable_categories for Lady's Card and Solitaire (009→011, 010→012)
--   - Fix Citi Rewards Mastercard: remove Utilities (009) rate/cap, add Fashion (011) rate/cap

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. New categories
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO categories (id, name, icon) VALUES
  ('00000000-0000-0000-0000-000000000011', 'Fashion', '👗'),
  ('00000000-0000-0000-0000-000000000012', 'Beauty',  '💄')
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Fix Lady's Card and Solitaire selectable categories
--    Remove stale 009/010 references; insert correct 011/012
-- ─────────────────────────────────────────────────────────────────────────────

DELETE FROM library_selectable_categories
WHERE card_id IN (
    '00000000-0000-0000-0001-000000000010',  -- UOB Lady's Card
    '00000000-0000-0000-0001-000000000011'   -- UOB Lady's Solitaire
  )
  AND category_id IN (
    '00000000-0000-0000-0000-000000000009',  -- was Utilities, wrongly assumed Fashion
    '00000000-0000-0000-0000-000000000010'   -- was Others, wrongly assumed Beauty
  );

INSERT INTO library_selectable_categories (card_id, category_id) VALUES
  ('00000000-0000-0000-0001-000000000010', '00000000-0000-0000-0000-000000000011'),  -- Lady's Card  → Fashion
  ('00000000-0000-0000-0001-000000000010', '00000000-0000-0000-0000-000000000012'),  -- Lady's Card  → Beauty
  ('00000000-0000-0000-0001-000000000011', '00000000-0000-0000-0000-000000000011'),  -- Solitaire    → Fashion
  ('00000000-0000-0000-0001-000000000011', '00000000-0000-0000-0000-000000000012')   -- Solitaire    → Beauty
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Fix Citi Rewards Mastercard
--    Remove the Utilities & Bills (009) rate/cap that was wrongly added as "Fashion"
--    Add the correct Fashion (011) rate and cap
-- ─────────────────────────────────────────────────────────────────────────────

-- Remove wrong Utilities bonus rate
DELETE FROM library_rates
WHERE card_id     = '00000000-0000-0000-0001-000000000017'
  AND category_id = '00000000-0000-0000-0000-000000000009';

-- Add correct Fashion bonus rate
INSERT INTO library_rates (card_id, category_id, mpd, effective_from) VALUES
  ('00000000-0000-0000-0001-000000000017', '00000000-0000-0000-0000-000000000011', 4.0, '2000-01-01')
ON CONFLICT (card_id, category_id, effective_from) DO NOTHING;

-- Swap the cap from Utilities (009) to Fashion (011)
-- Use UPDATE so the cap_group assignment from migration 010 is preserved
UPDATE library_caps
SET category_id = '00000000-0000-0000-0000-000000000011'
WHERE card_id     = '00000000-0000-0000-0001-000000000017'
  AND category_id = '00000000-0000-0000-0000-000000000009';
