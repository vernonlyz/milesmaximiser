-- 083: Per-MCC-tier bonus rates + Maybank Horizon (id ...008) full model.
--
-- New column card_mcc_eligibility.bonus_mpd: a matched MCC earns THIS rate instead of
-- the card's top bonus (NULL = legacy "promote to the card's max bonus"). This lets a
-- card pay different miles for different MCCs — e.g. Maybank Horizon: airlines 2.8 vs
-- 1.2 on everyday categories. The engine also confines a tiered bonus to the cap tied
-- to its own category, so lower (uncapped) tiers don't inherit the airline cap/threshold.
--
-- Horizon rates verified against MileLion (24-Aug-2026):
--   airlines 2.8 (S$10,000/mo cap, unlocks at S$800/mo total spend);
--   dining/groceries/petrol/transport/hotels/other-travel 1.2 (always earned);
--   FCY 2.8 unchanged (left as-is for now); base 0.4.
--
-- Idempotent.

ALTER TABLE card_mcc_eligibility ADD COLUMN IF NOT EXISTS bonus_mpd NUMERIC;

-- Horizon MCC tiers
UPDATE card_mcc_eligibility SET bonus_mpd = 2.8
  WHERE card_id = '00000000-0000-0000-0001-000000000008' AND category_label = 'Air Tickets';
UPDATE card_mcc_eligibility SET bonus_mpd = 1.2
  WHERE card_id = '00000000-0000-0000-0001-000000000008'
    AND category_label IN ('Hotels', 'Cruises / Travel / Car Rental', 'Supermarkets & Dining', 'Transport & Petrol', 'Department & Retail');

-- Threshold: the airline 2.8 unlocks only at S$800/mo total spend (below → base).
UPDATE library_caps SET min_spend = 800
  WHERE card_id = '00000000-0000-0000-0001-000000000008'
    AND category_id = '00000000-0000-0000-0000-000000000006' AND cap_period = 'monthly';

-- No-MCC fallback rates so the everyday 1.2 categories show 1.2 even without an MCC
-- (matches the tiered bonus). FCY (2.8) and Travel (2.8, airline headline) unchanged.
DELETE FROM library_rates WHERE card_id = '00000000-0000-0000-0001-000000000008'
  AND category_id IN (
    '00000000-0000-0000-0000-000000000001',  -- Dining
    '00000000-0000-0000-0000-000000000002',  -- Groceries
    '00000000-0000-0000-0000-000000000003',  -- Petrol
    '00000000-0000-0000-0000-000000000008')  -- Transport
  AND effective_from = '2000-01-01';
INSERT INTO library_rates (card_id, category_id, mpd, effective_from) VALUES
  ('00000000-0000-0000-0001-000000000008','00000000-0000-0000-0000-000000000001', 1.2, '2000-01-01'),
  ('00000000-0000-0000-0001-000000000008','00000000-0000-0000-0000-000000000002', 1.2, '2000-01-01'),
  ('00000000-0000-0000-0001-000000000008','00000000-0000-0000-0000-000000000003', 1.2, '2000-01-01'),
  ('00000000-0000-0000-0001-000000000008','00000000-0000-0000-0000-000000000008', 1.2, '2000-01-01');

-- Accurate remarks for the new model.
UPDATE card_library SET remarks = ARRAY[
    '2.8 mpd on all foreign currency spend (uncapped)',
    '2.8 mpd on air tickets — S$10,000/month cap; unlocks at S$800/month total spend',
    '1.2 mpd on dining, groceries, petrol, transport, hotels and other travel',
    'Miles expiry waived with S$24,000 annual spend (Rewards Infinite Programme)'
  ]
  WHERE id = '00000000-0000-0000-0001-000000000008';
