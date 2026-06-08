-- MilesMaximiser — combined cap groups and Citi Rewards cleanup
--
-- Adds cap_group to library_caps. Rows sharing the same cap_group for a card
-- are treated as a single combined spending limit by the engine and UI.
-- Example: HSBC Revolution's dining + shopping + transport + travel all draw
-- from one S$1,000/month pool.

ALTER TABLE library_caps ADD COLUMN IF NOT EXISTS cap_group TEXT;

-- ─────────────────────────────────────────────────────────────────────────────
-- Combined cap groups — "bonus" = all bonus categories share one limit
-- ─────────────────────────────────────────────────────────────────────────────

-- SC Journey: Dining + Groceries + Transport share S$1,000/month
UPDATE library_caps SET cap_group = 'bonus'
WHERE card_id = '00000000-0000-0000-0001-000000000004';

-- HSBC Revolution: Dining + Shopping + Transport + Travel share S$1,000/month
UPDATE library_caps SET cap_group = 'bonus'
WHERE card_id = '00000000-0000-0000-0001-000000000015';

-- Maybank XL Rewards: Dining + FCY + Travel + Entertainment + Shopping share S$1,000/month
UPDATE library_caps SET cap_group = 'bonus'
WHERE card_id = '00000000-0000-0000-0001-000000000016';

-- Citi Rewards Mastercard: Online Shopping + Fashion share S$1,000/month
UPDATE library_caps SET cap_group = 'bonus'
WHERE card_id = '00000000-0000-0000-0001-000000000017';

-- ─────────────────────────────────────────────────────────────────────────────
-- Citi Rewards cleanup — remove any unexpected bonus rate categories.
-- Only online shopping (004) and fashion (009) should earn 4 mpd.
-- ─────────────────────────────────────────────────────────────────────────────

DELETE FROM library_rates
WHERE card_id = '00000000-0000-0000-0001-000000000017'
  AND category_id NOT IN (
    '00000000-0000-0000-0000-000000000004',  -- online shopping
    '00000000-0000-0000-0000-000000000011'   -- fashion (011 — not 009 which is Utilities & Bills)
  );
