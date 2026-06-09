-- MilesMaximiser — card library seed data
-- Run AFTER all migrations.
-- Managed by admin. Users cannot edit these rates or caps.
-- To update a rate: INSERT a new row with a later effective_from date.
-- To remove a cap: INSERT a new row with spend_limit = NULL.

-- Category IDs
-- dining:           00000000-0000-0000-0000-000000000001
-- groceries:        00000000-0000-0000-0000-000000000002
-- petrol:           00000000-0000-0000-0000-000000000003
-- online shopping:  00000000-0000-0000-0000-000000000004
-- overseas:         00000000-0000-0000-0000-000000000005
-- travel:           00000000-0000-0000-0000-000000000006
-- entertainment:    00000000-0000-0000-0000-000000000007
-- transport:        00000000-0000-0000-0000-000000000008
-- utilities & bills:00000000-0000-0000-0000-000000000009  ← from initial seed; do NOT use for fashion
-- others:           00000000-0000-0000-0000-000000000010  ← from initial seed; do NOT use for beauty
-- fashion:          00000000-0000-0000-0000-000000000011  ← added in migration 011
-- beauty:           00000000-0000-0000-0000-000000000012  ← added in migration 011

-- ─────────────────────────────────────────────────────────────────────────────
-- Card Library
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO card_library (id, name, bank, card_network, base_mpd, color, mile_validity, remarks) VALUES
  ('00000000-0000-0000-0001-000000000001', 'Altitude Visa Signature',  'DBS',               'Visa',       1.3,  '#E31E35', 'No expiry',
     ARRAY['2 complimentary Priority Pass lounge visits per year']),
  ('00000000-0000-0000-0001-000000000002', 'Woman''s World Card',       'DBS',               'Mastercard', 0.4,  '#C0162E', '12 months',
     ARRAY['4 mpd covers all online purchases (SGD and FCY)', 'S$1,000/month cap on 4 mpd rate; excess earns base rate']),
  ('00000000-0000-0000-0001-000000000003', 'PRVI Miles Visa',           'UOB',               'Visa',       1.4,  '#00427E', '2 years',
     ARRAY['4 complimentary Priority Pass lounge visits per year', '8 mpd on Agoda and Expedia hotels (via UOB Travel portal)', '3 mpd on Expedia flights (via UOB Travel portal)', '3 mpd on IDR/MYR/THB/VND foreign currency spend']),
  ('00000000-0000-0000-0001-000000000004', 'Journey Credit Card',       'Standard Chartered','Visa',       1.2,  '#00854A', 'No expiry',
     ARRAY['2 complimentary Priority Pass lounge visits per year', '3 mpd applies to online SGD transactions (dining, groceries, food delivery, transport)', 'S$1,000/month combined cap across ALL 3 mpd bonus categories', 'Complimentary travel insurance via Allianz']),
  ('00000000-0000-0000-0001-000000000005', 'PremierMiles Visa',         'Citibank',          'Visa',       1.2,  '#003882', 'No expiry',
     ARRAY['2 complimentary Priority Pass lounge visits per year', '10 mpd on Kaligo hotel bookings', '7.2 mpd (FCY) / 6.2 mpd (SGD) on Agoda via Citi portal']),
  ('00000000-0000-0000-0001-000000000006', '90°N Visa',                 'OCBC',              'Visa',       1.3,  '#BE1833', 'No expiry',
     ARRAY['9 transfer partners; 1:1 ratio for KrisFlyer, Flying Blue, Marriott Bonvoy, IHG', 'No minimum spend requirement; no spending cap', 'No lounge access']),
  ('00000000-0000-0000-0001-000000000007', 'TravelOne Visa',            'HSBC',              'Visa',       1.2,  '#DB0011', '37 months',
     ARRAY['4 complimentary lounge visits per year (DragonPass/Mastercard Travel Pass)', '20 transfer partners — transfers instant and free of charge', 'Effective MPD varies by partner: 1.2/2.4 mpd (most partners), 1.0/2.0 mpd (KrisFlyer from Jan 2025)']),
  ('00000000-0000-0000-0001-000000000008', 'Horizon Visa Signature',    'Maybank',           'Visa',       0.4,  '#F7A900', '12 months',
     ARRAY['2.8 mpd on all foreign currency spend (no minimum spend, uncapped)', '2.8 mpd on air tickets, 1.2 mpd on dining/petrol/transport — both require S$800/month total spend', 'Miles expiry waived with S$24,000 annual spend (Rewards Infinite Programme)']),
  ('00000000-0000-0000-0001-000000000009', 'PRVI Miles Amex',           'UOB',               'Amex',       1.4,  '#00427E', '2 years',
     ARRAY['2 complimentary airport transfers per quarter (requires S$1,000 FCY spend to unlock)', 'Annual fee waived + 20,000 bonus miles when annual spend reaches S$50,000', '8 mpd on Agoda and Expedia hotels (via UOB Travel portal)', '3 mpd on Expedia flights (via UOB Travel portal)']),
  ('00000000-0000-0000-0001-000000000010', 'Lady''s Card',              'UOB',               'Mastercard', 0.4,  '#C2185B', '2 years',
     ARRAY['Choose 1 bonus category: Dining, Fashion, Beauty, Entertainment, Travel, or Transport', 'S$1,000/month cap on chosen bonus category']),
  ('00000000-0000-0000-0001-000000000011', 'Lady''s Solitaire Card',    'UOB',               'Mastercard', 0.4,  '#880E4F', '24 months',
     ARRAY['Choose 2 bonus categories: Dining, Fashion, Beauty, Entertainment, Travel, or Transport', 'S$750/month cap per chosen category (S$1,500/month combined)']),
  ('00000000-0000-0000-0001-000000000012', 'Visa Signature',            'UOB',               'Visa',       0.4,  '#1A237E', '2 years',
     ARRAY['Requires S$1,000/month total spend to unlock 4 mpd — earns 0.4 mpd base rate otherwise', 'Contactless + petrol share a combined S$1,200/month cap']),
  ('00000000-0000-0000-0001-000000000013', 'Preferred Platinum Visa',   'UOB',               'Visa',       0.4,  '#1565C0', '2 years',
     NULL),
  ('00000000-0000-0000-0001-000000000014', 'KrisFlyer Visa',            'UOB',               'Visa',       1.2,  '#003580', '3 years',
     ARRAY['Miles credited directly to KrisFlyer — no bank points currency, no transfer needed', '3 mpd on Singapore Airlines, Scoot, KrisShop, Kris+ and Pelago', '2.4 mpd on dining, online shopping, online travel, transport (requires S$800 SIA Group spend/year to unlock)']),
  ('00000000-0000-0000-0001-000000000015', 'Revolution',               'HSBC',              'Visa',       0.4,  '#C62828', '37 months',
     ARRAY['No annual fee', '4 mpd on dining, shopping, transport and travel (contactless and online)', 'S$1,000/month combined cap across all bonus categories', '8 mpd available with S$50,000 ADB in HSBC Everyday Global Account', '20 transfer partners, instant transfers with no conversion fee']),
  ('00000000-0000-0000-0001-000000000016', 'XL Rewards',               'Maybank',           'Visa',       0.4,  '#FF8F00', '12 months',
     ARRAY['Age restriction: applicants must be 21–39 at time of application', 'S$500/month minimum spend required to unlock 4 mpd bonus rates', 'S$1,000/month combined cap on all bonus categories', '4 mpd on ALL foreign currency spend (no MCC restrictions)', 'Annual fee waived first 2 years, then waivable with S$6,000 annual spend']),
  ('00000000-0000-0000-0001-000000000017', 'Rewards Mastercard',       'Citibank',          'Mastercard', 0.4,  '#0288D1', '5 years',
     ARRAY['4 mpd on all online purchases and in-store fashion (bags, shoes, clothing)', 'Travel bookings (airlines, hotels) excluded from 4 mpd online bonus', 'S$1,000/month combined cap on bonus categories', 'No lounge access'])
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- Bonus rates (effective from 2000-01-01 = "since launch")
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO library_rates (card_id, category_id, mpd, effective_from) VALUES
  -- DBS Altitude Visa — FCY 2.2 mpd; travel bonus removed Aug 2023
  ('00000000-0000-0000-0001-000000000001','00000000-0000-0000-0000-000000000005', 2.2, '2000-01-01'),
  -- DBS Woman's World — Online Shopping 4.0 mpd; FCY 1.2 mpd
  ('00000000-0000-0000-0001-000000000002','00000000-0000-0000-0000-000000000004', 4.0, '2000-01-01'),
  ('00000000-0000-0000-0001-000000000002','00000000-0000-0000-0000-000000000005', 1.2, '2000-01-01'),
  -- UOB PRVI Miles Visa — FCY 2.4 mpd (no general travel rate; portal rates in remarks)
  ('00000000-0000-0000-0001-000000000003','00000000-0000-0000-0000-000000000005', 2.4, '2000-01-01'),
  -- SC Journey — Dining, Groceries, Transport 3.0 mpd (online SGD); FCY 2.0 mpd
  ('00000000-0000-0000-0001-000000000004','00000000-0000-0000-0000-000000000001', 3.0, '2000-01-01'),
  ('00000000-0000-0000-0001-000000000004','00000000-0000-0000-0000-000000000002', 3.0, '2000-01-01'),
  ('00000000-0000-0000-0001-000000000004','00000000-0000-0000-0000-000000000005', 2.0, '2000-01-01'),
  ('00000000-0000-0000-0001-000000000004','00000000-0000-0000-0000-000000000008', 3.0, '2000-01-01'),
  -- Citi PremierMiles — FCY 2.2 mpd (portal bonuses in remarks)
  ('00000000-0000-0000-0001-000000000005','00000000-0000-0000-0000-000000000005', 2.2, '2000-01-01'),
  -- OCBC 90°N — FCY 2.1 mpd
  ('00000000-0000-0000-0001-000000000006','00000000-0000-0000-0000-000000000005', 2.1, '2000-01-01'),
  -- HSBC TravelOne — FCY 2.4 mpd (effective MPD varies by partner; see remarks)
  ('00000000-0000-0000-0001-000000000007','00000000-0000-0000-0000-000000000005', 2.4, '2000-01-01'),
  -- Maybank Horizon — FCY 2.8 mpd (uncapped); Travel (air tickets) 2.8 mpd (S$800/month threshold)
  ('00000000-0000-0000-0001-000000000008','00000000-0000-0000-0000-000000000005', 2.8, '2000-01-01'),
  ('00000000-0000-0000-0001-000000000008','00000000-0000-0000-0000-000000000006', 2.8, '2000-01-01'),
  -- UOB PRVI Miles Amex — FCY 2.4 mpd (no general travel rate; portal rates in remarks)
  ('00000000-0000-0000-0001-000000000009','00000000-0000-0000-0000-000000000005', 2.4, '2000-01-01'),
  -- UOB Lady's Card — 4 mpd on chosen category (default Dining; user sets override)
  ('00000000-0000-0000-0001-000000000010','00000000-0000-0000-0000-000000000001', 4.0, '2000-01-01'),
  -- UOB Lady's Solitaire — 4 mpd on 2 chosen categories (default Dining; user sets override)
  ('00000000-0000-0000-0001-000000000011','00000000-0000-0000-0000-000000000001', 4.0, '2000-01-01'),
  -- UOB Visa Signature — 4 mpd on overseas/petrol/contactless (requires S$1,000/month min spend)
  ('00000000-0000-0000-0001-000000000012','00000000-0000-0000-0000-000000000005', 4.0, '2000-01-01'),
  ('00000000-0000-0000-0001-000000000012','00000000-0000-0000-0000-000000000003', 4.0, '2000-01-01'),
  ('00000000-0000-0000-0001-000000000012','00000000-0000-0000-0000-000000000008', 4.0, '2000-01-01'),
  -- UOB Preferred Platinum Visa — 4 mpd on online shopping + contactless
  ('00000000-0000-0000-0001-000000000013','00000000-0000-0000-0000-000000000004', 4.0, '2000-01-01'),
  ('00000000-0000-0000-0001-000000000013','00000000-0000-0000-0000-000000000008', 4.0, '2000-01-01'),
  -- UOB KrisFlyer Visa — 3.0 mpd on SIA Group; no FCY bonus (overseas earns base 1.2 mpd)
  ('00000000-0000-0000-0001-000000000014','00000000-0000-0000-0000-000000000006', 3.0, '2000-01-01'),
  -- HSBC Revolution — 4 mpd on dining, online shopping, transport, travel
  ('00000000-0000-0000-0001-000000000015','00000000-0000-0000-0000-000000000001', 4.0, '2000-01-01'),  -- dining
  ('00000000-0000-0000-0001-000000000015','00000000-0000-0000-0000-000000000004', 4.0, '2000-01-01'),  -- online shopping
  ('00000000-0000-0000-0001-000000000015','00000000-0000-0000-0000-000000000008', 4.0, '2000-01-01'),  -- transport
  ('00000000-0000-0000-0001-000000000015','00000000-0000-0000-0000-000000000006', 4.0, '2000-01-01'),  -- travel
  -- Maybank XL Rewards — 4 mpd on dining, FCY, travel, entertainment, online shopping
  ('00000000-0000-0000-0001-000000000016','00000000-0000-0000-0000-000000000001', 4.0, '2000-01-01'),  -- dining
  ('00000000-0000-0000-0001-000000000016','00000000-0000-0000-0000-000000000005', 4.0, '2000-01-01'),  -- overseas/FCY
  ('00000000-0000-0000-0001-000000000016','00000000-0000-0000-0000-000000000006', 4.0, '2000-01-01'),  -- travel
  ('00000000-0000-0000-0001-000000000016','00000000-0000-0000-0000-000000000007', 4.0, '2000-01-01'),  -- entertainment
  ('00000000-0000-0000-0001-000000000016','00000000-0000-0000-0000-000000000004', 4.0, '2000-01-01'),  -- online shopping
  -- Citi Rewards Mastercard — 4 mpd on online shopping and fashion
  ('00000000-0000-0000-0001-000000000017','00000000-0000-0000-0000-000000000004', 4.0, '2000-01-01'),  -- online shopping
  ('00000000-0000-0000-0001-000000000017','00000000-0000-0000-0000-000000000011', 4.0, '2000-01-01')   -- fashion (011)
ON CONFLICT (card_id, category_id, effective_from) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- Spending caps
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO library_caps (card_id, category_id, cap_period, spend_limit, effective_from) VALUES
  -- DBS Altitude — no caps
  -- DBS Woman's World — Online Shopping S$1,000/month
  ('00000000-0000-0000-0001-000000000002','00000000-0000-0000-0000-000000000004','monthly', 1000.00,'2000-01-01'),
  -- SC Journey — S$1,000/month per modelled category (actual card has S$1,000 combined — see remarks)
  ('00000000-0000-0000-0001-000000000004','00000000-0000-0000-0000-000000000001','monthly', 1000.00,'2000-01-01'),
  ('00000000-0000-0000-0001-000000000004','00000000-0000-0000-0000-000000000002','monthly', 1000.00,'2000-01-01'),
  ('00000000-0000-0000-0001-000000000004','00000000-0000-0000-0000-000000000008','monthly', 1000.00,'2000-01-01'),
  -- Maybank Horizon — Travel (air tickets) S$10,000/month
  ('00000000-0000-0000-0001-000000000008','00000000-0000-0000-0000-000000000006','monthly',10000.00,'2000-01-01'),
  -- UOB Lady's Card — S$1,000/month on chosen category
  ('00000000-0000-0000-0001-000000000010','00000000-0000-0000-0000-000000000001','monthly', 1000.00,'2000-01-01'),
  -- UOB Lady's Solitaire — S$750/month per chosen category
  ('00000000-0000-0000-0001-000000000011','00000000-0000-0000-0000-000000000001','monthly',  750.00,'2000-01-01'),
  -- UOB Visa Signature — FCY S$1,200/month; contactless+petrol combined S$1,200 (modelled per-category)
  ('00000000-0000-0000-0001-000000000012','00000000-0000-0000-0000-000000000005','monthly', 1200.00,'2000-01-01'),
  ('00000000-0000-0000-0001-000000000012','00000000-0000-0000-0000-000000000003','monthly',  600.00,'2000-01-01'),
  ('00000000-0000-0000-0001-000000000012','00000000-0000-0000-0000-000000000008','monthly',  600.00,'2000-01-01'),
  -- UOB Preferred Platinum — S$600/month per category (online and contactless are separate caps)
  ('00000000-0000-0000-0001-000000000013','00000000-0000-0000-0000-000000000004','monthly',  600.00,'2000-01-01'),
  ('00000000-0000-0000-0001-000000000013','00000000-0000-0000-0000-000000000008','monthly',  600.00,'2000-01-01'),
  -- HSBC Revolution — S$1,000/month combined across dining, shopping, transport, travel
  ('00000000-0000-0000-0001-000000000015','00000000-0000-0000-0000-000000000001','monthly', 1000.00,'2000-01-01'),
  ('00000000-0000-0000-0001-000000000015','00000000-0000-0000-0000-000000000004','monthly', 1000.00,'2000-01-01'),
  ('00000000-0000-0000-0001-000000000015','00000000-0000-0000-0000-000000000008','monthly', 1000.00,'2000-01-01'),
  ('00000000-0000-0000-0001-000000000015','00000000-0000-0000-0000-000000000006','monthly', 1000.00,'2000-01-01'),
  -- Maybank XL Rewards — S$1,000/month combined across all bonus categories
  ('00000000-0000-0000-0001-000000000016','00000000-0000-0000-0000-000000000001','monthly', 1000.00,'2000-01-01'),
  ('00000000-0000-0000-0001-000000000016','00000000-0000-0000-0000-000000000005','monthly', 1000.00,'2000-01-01'),
  ('00000000-0000-0000-0001-000000000016','00000000-0000-0000-0000-000000000006','monthly', 1000.00,'2000-01-01'),
  ('00000000-0000-0000-0001-000000000016','00000000-0000-0000-0000-000000000007','monthly', 1000.00,'2000-01-01'),
  ('00000000-0000-0000-0001-000000000016','00000000-0000-0000-0000-000000000004','monthly', 1000.00,'2000-01-01'),
  -- Citi Rewards Mastercard — S$1,000/month combined across online shopping and fashion
  ('00000000-0000-0000-0001-000000000017','00000000-0000-0000-0000-000000000004','monthly', 1000.00,'2000-01-01'),
  ('00000000-0000-0000-0001-000000000017','00000000-0000-0000-0000-000000000011','monthly', 1000.00,'2000-01-01')  -- fashion (011)
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- Combined cap groups
-- Rows with the same cap_group for a card share a single spending limit.
-- Must run after the INSERT above (requires the cap_group column from migration 010).
-- ─────────────────────────────────────────────────────────────────────────────

UPDATE library_caps SET cap_group = 'bonus' WHERE card_id = '00000000-0000-0000-0001-000000000004';  -- SC Journey
UPDATE library_caps SET cap_group = 'bonus' WHERE card_id = '00000000-0000-0000-0001-000000000015';  -- HSBC Revolution
UPDATE library_caps SET cap_group = 'bonus' WHERE card_id = '00000000-0000-0000-0001-000000000016';  -- Maybank XL Rewards
UPDATE library_caps SET cap_group = 'bonus' WHERE card_id = '00000000-0000-0000-0001-000000000017';  -- Citi Rewards

-- ─────────────────────────────────────────────────────────────────────────────
-- Minimum spend thresholds
-- Bonus rates are locked until total card spend for the period reaches min_spend.
-- ─────────────────────────────────────────────────────────────────────────────

-- UOB Visa Signature: S$1,000/month total card spend required to unlock 4 mpd
UPDATE library_caps SET min_spend = 1000 WHERE card_id = '00000000-0000-0000-0001-000000000012';

-- Maybank XL Rewards: S$500/month total card spend required to unlock 4 mpd
UPDATE library_caps SET min_spend = 500  WHERE card_id = '00000000-0000-0000-0001-000000000016';
