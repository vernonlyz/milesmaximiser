-- MilesMaximiser — mile validity and remarks; correct wrong seed data
--
-- New columns:
--   card_library.mile_validity  TEXT      — e.g. "No expiry", "12 months"
--   card_library.remarks        TEXT[]    — bullet-point notes shown in the UI
--
-- Data corrections (all treated as wrong-from-launch, not rate changes):
--   Citi PremierMiles  — overseas rate 2.0 → 2.2 mpd
--   DBS Woman's World  — base_mpd 1.5 → 0.4; overseas rate 2.0 → 1.2 mpd; cap 1500 → 1000
--   UOB Lady's Solitaire — cap per category 2000 → 750

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. New columns
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE card_library ADD COLUMN IF NOT EXISTS mile_validity TEXT;
ALTER TABLE card_library ADD COLUMN IF NOT EXISTS remarks       TEXT[];

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Mile validity
-- ─────────────────────────────────────────────────────────────────────────────

UPDATE card_library SET mile_validity = 'No expiry' WHERE id = '00000000-0000-0000-0001-000000000005';  -- Citi PremierMiles
UPDATE card_library SET mile_validity = '12 months' WHERE id = '00000000-0000-0000-0001-000000000002';  -- DBS Woman's World
UPDATE card_library SET mile_validity = '24 months' WHERE id = '00000000-0000-0000-0001-000000000011';  -- UOB Lady's Solitaire

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Remarks
-- ─────────────────────────────────────────────────────────────────────────────

UPDATE card_library
SET remarks = ARRAY['2 free lounge visits per year', '7.2 mpd on Agoda, 10 mpd on Kaligo']
WHERE id = '00000000-0000-0000-0001-000000000005';  -- Citi PremierMiles

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Correct wrong rates
-- ─────────────────────────────────────────────────────────────────────────────

-- Citi PremierMiles: overseas 2.0 → 2.2 mpd
INSERT INTO library_rates (card_id, category_id, mpd, effective_from) VALUES
  ('00000000-0000-0000-0001-000000000005', '00000000-0000-0000-0000-000000000005', 2.2, '2000-01-01')
ON CONFLICT (card_id, category_id, effective_from) DO UPDATE SET mpd = EXCLUDED.mpd;

-- DBS Woman's World: overseas 2.0 → 1.2 mpd
INSERT INTO library_rates (card_id, category_id, mpd, effective_from) VALUES
  ('00000000-0000-0000-0001-000000000002', '00000000-0000-0000-0000-000000000005', 1.2, '2000-01-01')
ON CONFLICT (card_id, category_id, effective_from) DO UPDATE SET mpd = EXCLUDED.mpd;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Correct wrong base MPD
-- ─────────────────────────────────────────────────────────────────────────────

-- DBS Woman's World: base_mpd 1.5 → 0.4
UPDATE card_library SET base_mpd = 0.4 WHERE id = '00000000-0000-0000-0001-000000000002';

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Correct wrong caps
-- ─────────────────────────────────────────────────────────────────────────────

-- DBS Woman's World: online shopping cap 1500 → 1000
UPDATE library_caps
SET spend_limit = 1000.00
WHERE card_id        = '00000000-0000-0000-0001-000000000002'
  AND category_id    = '00000000-0000-0000-0000-000000000004'
  AND cap_period     = 'monthly'
  AND effective_from = '2000-01-01';

-- UOB Lady's Solitaire: cap per chosen category 2000 → 750
-- The cap row uses the library "bonus slot" category (Dining) as a template;
-- applySelectableOverride clones it per chosen category, so this 750 applies to each.
UPDATE library_caps
SET spend_limit = 750.00
WHERE card_id        = '00000000-0000-0000-0001-000000000011'
  AND category_id    = '00000000-0000-0000-0000-000000000001'
  AND cap_period     = 'monthly'
  AND effective_from = '2000-01-01';
