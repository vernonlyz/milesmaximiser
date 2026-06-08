-- MilesMaximiser — comprehensive card data corrections from milelion.com (2026-06-08)
--
-- Summary of changes:
--  DBS Altitude        base 1.2→1.3; FCY 2.0→2.2; travel rate+cap removed (discontinued Aug 2023)
--  DBS Woman's World   add remarks (data corrected in 007)
--  UOB PRVI Miles V/A  remove travel rate (portal-only, not a general category); add mile_validity/remarks
--  SC Journey          remove petrol (not a bonus MCC); add transport; add mile_validity/remarks
--  Citi PremierMiles   update remarks to be more precise (rate corrected in 007)
--  OCBC 90°N           base 1.2→1.3; add mile_validity/remarks
--  HSBC TravelOne      add mile_validity/remarks
--  Maybank Horizon     FCY 2.0→2.8; remove stale category rates; add travel 2.8+cap; add mile_validity/remarks
--  UOB Lady's Card     add mile_validity/remarks
--  UOB Lady's Solitaire add remarks (mile_validity added in 007)
--  UOB Visa Signature  caps quarterly S$2,000 → monthly S$1,200; add mile_validity/remarks
--  UOB Preferred Plat  caps quarterly S$1,110 → monthly S$600; add mile_validity
--  UOB KrisFlyer       remove FCY rate (no bonus on overseas — same as base); add mile_validity/remarks

-- ─────────────────────────────────────────────────────────────────────────────
-- DBS Altitude Visa Signature
-- ─────────────────────────────────────────────────────────────────────────────

UPDATE card_library SET base_mpd = 1.3 WHERE id = '00000000-0000-0000-0001-000000000001';

-- FCY: 2.0 → 2.2 mpd
INSERT INTO library_rates (card_id, category_id, mpd, effective_from) VALUES
  ('00000000-0000-0000-0001-000000000001', '00000000-0000-0000-0000-000000000005', 2.2, '2000-01-01')
ON CONFLICT (card_id, category_id, effective_from) DO UPDATE SET mpd = EXCLUDED.mpd;

-- Remove travel 3.0 mpd (DBS removed this in August 2023)
DELETE FROM library_rates
WHERE card_id     = '00000000-0000-0000-0001-000000000001'
  AND category_id = '00000000-0000-0000-0000-000000000006';

-- Remove travel spending cap (S$5,000/month — no longer applicable)
DELETE FROM library_caps
WHERE card_id     = '00000000-0000-0000-0001-000000000001'
  AND category_id = '00000000-0000-0000-0000-000000000006';

UPDATE card_library
SET mile_validity = 'No expiry',
    remarks = ARRAY['2 complimentary Priority Pass lounge visits per year']
WHERE id = '00000000-0000-0000-0001-000000000001';

-- ─────────────────────────────────────────────────────────────────────────────
-- DBS Woman's World Card
-- (base_mpd, overseas rate, cap already corrected in 007 — remarks only)
-- ─────────────────────────────────────────────────────────────────────────────

UPDATE card_library
SET remarks = ARRAY[
      '4 mpd covers all online purchases (SGD and FCY)',
      'S$1,000/month cap on 4 mpd rate; excess earns base rate'
    ]
WHERE id = '00000000-0000-0000-0001-000000000002';

-- ─────────────────────────────────────────────────────────────────────────────
-- UOB PRVI Miles Visa
-- ─────────────────────────────────────────────────────────────────────────────

-- Remove general travel 3.0 rate — portal rates (8 mpd Agoda/Expedia) are noted in remarks only
DELETE FROM library_rates
WHERE card_id     = '00000000-0000-0000-0001-000000000003'
  AND category_id = '00000000-0000-0000-0000-000000000006';

UPDATE card_library
SET mile_validity = '2 years',
    remarks = ARRAY[
      '4 complimentary Priority Pass lounge visits per year',
      '8 mpd on Agoda and Expedia hotels (via UOB Travel portal)',
      '3 mpd on Expedia flights (via UOB Travel portal)',
      '3 mpd on IDR/MYR/THB/VND foreign currency spend'
    ]
WHERE id = '00000000-0000-0000-0001-000000000003';

-- ─────────────────────────────────────────────────────────────────────────────
-- Standard Chartered Journey Credit Card
-- ─────────────────────────────────────────────────────────────────────────────

-- Remove petrol 3.0 mpd (petrol MCCs are not in SC Journey's bonus MCC list)
DELETE FROM library_rates
WHERE card_id     = '00000000-0000-0000-0001-000000000004'
  AND category_id = '00000000-0000-0000-0000-000000000003';

-- Remove associated petrol cap
DELETE FROM library_caps
WHERE card_id     = '00000000-0000-0000-0001-000000000004'
  AND category_id = '00000000-0000-0000-0000-000000000003';

-- Add transport 3.0 mpd (ride-sharing MCCs 4111/4121/4789 qualify for the online bonus)
INSERT INTO library_rates (card_id, category_id, mpd, effective_from) VALUES
  ('00000000-0000-0000-0001-000000000004', '00000000-0000-0000-0000-000000000008', 3.0, '2000-01-01')
ON CONFLICT (card_id, category_id, effective_from) DO NOTHING;

-- Add transport cap (part of combined S$1,000/month cap — see remarks)
INSERT INTO library_caps (card_id, category_id, cap_period, spend_limit, effective_from) VALUES
  ('00000000-0000-0000-0001-000000000004', '00000000-0000-0000-0000-000000000008', 'monthly', 1000.00, '2000-01-01')
ON CONFLICT DO NOTHING;

UPDATE card_library
SET mile_validity = 'No expiry',
    remarks = ARRAY[
      '2 complimentary Priority Pass lounge visits per year',
      '3 mpd applies to online SGD transactions (dining, groceries, food delivery, transport)',
      'S$1,000/month combined cap across ALL 3 mpd bonus categories',
      'Complimentary travel insurance via Allianz'
    ]
WHERE id = '00000000-0000-0000-0001-000000000004';

-- ─────────────────────────────────────────────────────────────────────────────
-- Citi PremierMiles Visa
-- (overseas 2.2 mpd and mile_validity already set in 007 — update remarks only)
-- ─────────────────────────────────────────────────────────────────────────────

UPDATE card_library
SET remarks = ARRAY[
      '2 complimentary Priority Pass lounge visits per year',
      '10 mpd on Kaligo hotel bookings',
      '7.2 mpd (FCY) / 6.2 mpd (SGD) on Agoda via Citi portal'
    ]
WHERE id = '00000000-0000-0000-0001-000000000005';

-- ─────────────────────────────────────────────────────────────────────────────
-- OCBC 90°N Visa
-- ─────────────────────────────────────────────────────────────────────────────

UPDATE card_library SET base_mpd = 1.3 WHERE id = '00000000-0000-0000-0001-000000000006';

UPDATE card_library
SET mile_validity = 'No expiry',
    remarks = ARRAY[
      '9 transfer partners; 1:1 ratio for KrisFlyer, Flying Blue, Marriott Bonvoy, IHG',
      'No minimum spend requirement; no spending cap',
      'No lounge access'
    ]
WHERE id = '00000000-0000-0000-0001-000000000006';

-- ─────────────────────────────────────────────────────────────────────────────
-- HSBC TravelOne Visa
-- ─────────────────────────────────────────────────────────────────────────────

UPDATE card_library
SET mile_validity = '37 months',
    remarks = ARRAY[
      '4 complimentary lounge visits per year (DragonPass/Mastercard Travel Pass)',
      '20 transfer partners — transfers instant and free of charge',
      'Effective MPD varies by partner: 1.2/2.4 mpd (most partners), 1.0/2.0 mpd (KrisFlyer from Jan 2025)'
    ]
WHERE id = '00000000-0000-0000-0001-000000000007';

-- ─────────────────────────────────────────────────────────────────────────────
-- Maybank Horizon Visa Signature
-- ─────────────────────────────────────────────────────────────────────────────

-- Update FCY rate: 2.0 → 2.8 mpd (no minimum spend required; uncapped)
INSERT INTO library_rates (card_id, category_id, mpd, effective_from) VALUES
  ('00000000-0000-0000-0001-000000000008', '00000000-0000-0000-0000-000000000005', 2.8, '2000-01-01')
ON CONFLICT (card_id, category_id, effective_from) DO UPDATE SET mpd = EXCLUDED.mpd;

-- Remove stale per-category rates (dining 2.0, petrol 3.2, travel 2.0, transport 2.0)
-- Current card earns 1.2 mpd on these with S$800 threshold — modelled as a remark, not a rate row
DELETE FROM library_rates
WHERE card_id     = '00000000-0000-0000-0001-000000000008'
  AND category_id IN (
    '00000000-0000-0000-0000-000000000001',  -- dining
    '00000000-0000-0000-0000-000000000003',  -- petrol
    '00000000-0000-0000-0000-000000000008'   -- transport
  );

-- Update travel (air tickets) rate: 2.0 → 2.8 mpd (requires S$800/month total spend)
INSERT INTO library_rates (card_id, category_id, mpd, effective_from) VALUES
  ('00000000-0000-0000-0001-000000000008', '00000000-0000-0000-0000-000000000006', 2.8, '2000-01-01')
ON CONFLICT (card_id, category_id, effective_from) DO UPDATE SET mpd = EXCLUDED.mpd;

-- Remove old stale caps (petrol S$200, dining S$800, travel S$800, transport S$800)
DELETE FROM library_caps WHERE card_id = '00000000-0000-0000-0001-000000000008';

-- Add correct travel (air tickets) cap: S$10,000/month
INSERT INTO library_caps (card_id, category_id, cap_period, spend_limit, effective_from) VALUES
  ('00000000-0000-0000-0001-000000000008', '00000000-0000-0000-0000-000000000006', 'monthly', 10000.00, '2000-01-01')
ON CONFLICT DO NOTHING;

UPDATE card_library
SET mile_validity = '12 months',
    remarks = ARRAY[
      '2.8 mpd on all foreign currency spend (no minimum spend, uncapped)',
      '2.8 mpd on air tickets, 1.2 mpd on dining/petrol/transport — both require S$800/month total spend',
      'Miles expiry waived with S$24,000 annual spend (Rewards Infinite Programme)'
    ]
WHERE id = '00000000-0000-0000-0001-000000000008';

-- ─────────────────────────────────────────────────────────────────────────────
-- UOB PRVI Miles Amex
-- ─────────────────────────────────────────────────────────────────────────────

-- Remove general travel 3.0 rate (same reason as Visa variant)
DELETE FROM library_rates
WHERE card_id     = '00000000-0000-0000-0001-000000000009'
  AND category_id = '00000000-0000-0000-0000-000000000006';

UPDATE card_library
SET mile_validity = '2 years',
    remarks = ARRAY[
      '2 complimentary airport transfers per quarter (requires S$1,000 FCY spend to unlock)',
      'Annual fee waived + 20,000 bonus miles when annual spend reaches S$50,000',
      '8 mpd on Agoda and Expedia hotels (via UOB Travel portal)',
      '3 mpd on Expedia flights (via UOB Travel portal)'
    ]
WHERE id = '00000000-0000-0000-0001-000000000009';

-- ─────────────────────────────────────────────────────────────────────────────
-- UOB Lady's Card
-- ─────────────────────────────────────────────────────────────────────────────

UPDATE card_library
SET mile_validity = '2 years',
    remarks = ARRAY[
      'Choose 1 bonus category: Dining, Fashion, Beauty, Entertainment, Travel, or Transport',
      'S$1,000/month cap on chosen bonus category'
    ]
WHERE id = '00000000-0000-0000-0001-000000000010';

-- ─────────────────────────────────────────────────────────────────────────────
-- UOB Lady's Solitaire Card
-- (mile_validity and cap already corrected in 007 — remarks only)
-- ─────────────────────────────────────────────────────────────────────────────

UPDATE card_library
SET remarks = ARRAY[
      'Choose 2 bonus categories: Dining, Fashion, Beauty, Entertainment, Travel, or Transport',
      'S$750/month cap per chosen category (S$1,500/month combined)'
    ]
WHERE id = '00000000-0000-0000-0001-000000000011';

-- ─────────────────────────────────────────────────────────────────────────────
-- UOB Visa Signature
-- ─────────────────────────────────────────────────────────────────────────────

-- Remove old quarterly S$2,000 caps
DELETE FROM library_caps WHERE card_id = '00000000-0000-0000-0001-000000000012';

-- New monthly caps: overseas FCY S$1,200; contactless+petrol combined S$1,200
-- Modelled as per-category (combined cap limitation — see remarks)
INSERT INTO library_caps (card_id, category_id, cap_period, spend_limit, effective_from) VALUES
  ('00000000-0000-0000-0001-000000000012', '00000000-0000-0000-0000-000000000005', 'monthly', 1200.00, '2000-01-01'),  -- overseas FCY
  ('00000000-0000-0000-0001-000000000012', '00000000-0000-0000-0000-000000000003', 'monthly',  600.00, '2000-01-01'),  -- petrol (half of combined S$1,200)
  ('00000000-0000-0000-0001-000000000012', '00000000-0000-0000-0000-000000000008', 'monthly',  600.00, '2000-01-01')   -- contactless/transport (half of combined)
ON CONFLICT DO NOTHING;

UPDATE card_library
SET mile_validity = '2 years',
    remarks = ARRAY[
      'Requires S$1,000/month total spend to unlock 4 mpd — earns 0.4 mpd base rate otherwise',
      'Contactless + petrol share a combined S$1,200/month cap'
    ]
WHERE id = '00000000-0000-0000-0001-000000000012';

-- ─────────────────────────────────────────────────────────────────────────────
-- UOB Preferred Platinum Visa
-- ─────────────────────────────────────────────────────────────────────────────

-- Remove old quarterly S$1,110 caps
DELETE FROM library_caps WHERE card_id = '00000000-0000-0000-0001-000000000013';

-- New monthly caps: S$600 per category (online shopping and contactless are separate)
INSERT INTO library_caps (card_id, category_id, cap_period, spend_limit, effective_from) VALUES
  ('00000000-0000-0000-0001-000000000013', '00000000-0000-0000-0000-000000000004', 'monthly', 600.00, '2000-01-01'),  -- online shopping
  ('00000000-0000-0000-0001-000000000013', '00000000-0000-0000-0000-000000000008', 'monthly', 600.00, '2000-01-01')   -- contactless/transport
ON CONFLICT DO NOTHING;

UPDATE card_library SET mile_validity = '2 years' WHERE id = '00000000-0000-0000-0001-000000000013';

-- ─────────────────────────────────────────────────────────────────────────────
-- UOB KrisFlyer Visa
-- ─────────────────────────────────────────────────────────────────────────────

-- Remove FCY rate (overseas earns the same 1.2 mpd as local — no bonus for foreign currency)
DELETE FROM library_rates
WHERE card_id     = '00000000-0000-0000-0001-000000000014'
  AND category_id = '00000000-0000-0000-0000-000000000005';

UPDATE card_library
SET mile_validity = '3 years',
    remarks = ARRAY[
      'Miles credited directly to KrisFlyer — no bank points currency, no transfer needed',
      '3 mpd on Singapore Airlines, Scoot, KrisShop, Kris+ and Pelago',
      '2.4 mpd on dining, online shopping, online travel, transport (requires S$800 SIA Group spend/year to unlock)'
    ]
WHERE id = '00000000-0000-0000-0001-000000000014';
