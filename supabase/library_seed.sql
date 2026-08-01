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
INSERT INTO card_library (id, name, bank, card_network, base_mpd, color, mile_validity, remarks, cap_cycle, earn_increment, card_type, cashback_rate) VALUES
  ('00000000-0000-0000-0001-000000000001', 'Altitude Visa Signature',  'DBS',               'Visa',       1.3,  '#E31E35', 'No expiry',
     ARRAY['2 complimentary Priority Pass lounge visits per year'], 'calendar', 5, 'miles', NULL),
  ('00000000-0000-0000-0001-000000000002', 'Woman''s World Card',       'DBS',               'Mastercard', 0.4,  '#C0162E', '12 months',
     ARRAY['4 mpd covers all online purchases (SGD and FCY)', 'S$1,000/month cap on 4 mpd rate; excess earns base rate'], 'calendar', 5, 'miles', NULL),
  ('00000000-0000-0000-0001-000000000003', 'PRVI Miles Visa',           'UOB',               'Visa',       1.4,  '#00427E', '2 years',
     ARRAY['4 complimentary Priority Pass lounge visits per year', '8 mpd on Agoda and Expedia hotels (via UOB Travel portal)', '3 mpd on Expedia flights (via UOB Travel portal)', '3 mpd on IDR/MYR/THB/VND foreign currency spend'], 'calendar', 5, 'miles', NULL),
  ('00000000-0000-0000-0001-000000000004', 'Journey Credit Card',       'Standard Chartered','Visa',       1.2,  '#00854A', 'No expiry',
     ARRAY['2 complimentary Priority Pass lounge visits per year', '3 mpd applies to online SGD transactions (dining, groceries, food delivery, transport)', 'S$1,000/month combined cap across ALL 3 mpd bonus categories', 'Complimentary travel insurance via Allianz'], 'calendar', 5, 'miles', NULL),
  ('00000000-0000-0000-0001-000000000005', 'PremierMiles Visa',         'Citibank',          'Visa',       1.2,  '#003882', 'No expiry',
     ARRAY['2 complimentary Priority Pass lounge visits per year', '10 mpd on Kaligo hotel bookings', '7.2 mpd (FCY) / 6.2 mpd (SGD) on Agoda via Citi portal'], 'calendar', 1, 'miles', NULL),
  ('00000000-0000-0000-0001-000000000006', '90°N Visa',                 'OCBC',              'Visa',       1.3,  '#BE1833', 'No expiry',
     ARRAY['9 transfer partners; 1:1 ratio for KrisFlyer, Flying Blue, Marriott Bonvoy, IHG', 'No minimum spend requirement; no spending cap', 'No lounge access'], 'calendar', 5, 'miles', NULL),
  ('00000000-0000-0000-0001-000000000007', 'TravelOne Visa',            'HSBC',              'Visa',       1.2,  '#DB0011', '37 months',
     ARRAY['4 complimentary lounge visits per year (DragonPass/Mastercard Travel Pass)', '20 transfer partners — transfers instant and free of charge', 'Effective MPD varies by partner: 1.2/2.4 mpd (most partners), 1.0/2.0 mpd (KrisFlyer from Jan 2025)'], 'calendar', 1, 'miles', NULL),
  ('00000000-0000-0000-0001-000000000008', 'Horizon Visa Signature',    'Maybank',           'Visa',       0.4,  '#F7A900', '12 months',
     ARRAY['2.8 mpd on all foreign currency spend (no minimum spend, uncapped)', '2.8 mpd on air tickets, 1.2 mpd on dining/petrol/transport — both require S$800/month total spend', 'Miles expiry waived with S$24,000 annual spend (Rewards Infinite Programme)'], 'calendar', 5, 'miles', NULL),
  ('00000000-0000-0000-0001-000000000009', 'PRVI Miles Amex',           'UOB',               'Amex',       1.4,  '#00427E', '2 years',
     ARRAY['2 complimentary airport transfers per quarter (requires S$1,000 FCY spend to unlock)', 'Annual fee waived + 20,000 bonus miles when annual spend reaches S$50,000', '8 mpd on Agoda and Expedia hotels (via UOB Travel portal)', '3 mpd on Expedia flights (via UOB Travel portal)'], 'calendar', 5, 'miles', NULL),
  ('00000000-0000-0000-0001-000000000010', 'Lady''s Card',              'UOB',               'Mastercard', 0.4,  '#C2185B', '2 years',
     ARRAY['Choose 1 bonus category: Dining, Fashion, Beauty, Entertainment, Travel, or Transport', 'S$1,000/month cap on chosen bonus category'], 'calendar', 5, 'miles', NULL),
  ('00000000-0000-0000-0001-000000000011', 'Lady''s Solitaire Card',    'UOB',               'Mastercard', 0.4,  '#880E4F', '24 months',
     ARRAY['Choose 2 bonus categories: Dining, Fashion, Beauty, Entertainment, Travel, or Transport', 'S$750/month cap per chosen category (S$1,500/month combined)'], 'calendar', 5, 'miles', NULL),
  ('00000000-0000-0000-0001-000000000012', 'Visa Signature',            'UOB',               'Visa',       0.4,  '#1A237E', '2 years',
     ARRAY['Requires S$1,000/month total spend to unlock 4 mpd — earns 0.4 mpd base rate otherwise', '4 mpd on all tap-to-pay spend (any category, incl. petrol) — S$1,200/month cap', '4 mpd on overseas FCY — S$1,200/month cap (separate from contactless pool)'], 'statement', 5, 'miles', NULL),
  ('00000000-0000-0000-0001-000000000013', 'Preferred Platinum Visa',   'UOB',               'Visa',       0.4,  '#1565C0', '2 years',
     NULL, 'calendar', 5, 'miles', NULL),
  ('00000000-0000-0000-0001-000000000014', 'KrisFlyer Visa',            'UOB',               'Visa',       1.2,  '#003580', '3 years',
     ARRAY['Miles credited directly to KrisFlyer — no bank points currency, no transfer needed', '3 mpd on Singapore Airlines, Scoot, KrisShop, Kris+ and Pelago', '2.4 mpd on dining, online shopping, online travel, transport (requires S$800 SIA Group spend/year to unlock)'], 'calendar', 5, 'miles', NULL),
  ('00000000-0000-0000-0001-000000000015', 'Revolution',               'HSBC',              'Visa',       0.4,  '#C62828', '37 months',
     ARRAY['No annual fee', '4 mpd on dining, shopping, transport and travel (contactless and online)', 'S$1,000/month combined cap across all bonus categories', '8 mpd available with S$50,000 ADB in HSBC Everyday Global Account', '20 transfer partners, instant transfers with no conversion fee'], 'calendar', 1, 'miles', NULL),
  ('00000000-0000-0000-0001-000000000016', 'XL Rewards',               'Maybank',           'Visa',       0.4,  '#FF8F00', '12 months',
     ARRAY['Age restriction: applicants must be 21–39 at time of application', 'S$500/month minimum spend required to unlock 4 mpd bonus rates', 'S$1,000/month combined cap on all bonus categories', '4 mpd on ALL foreign currency spend (no MCC restrictions)', 'Annual fee waived first 2 years, then waivable with S$6,000 annual spend'], 'calendar', 5, 'miles', NULL),
  ('00000000-0000-0000-0001-000000000017', 'Rewards Mastercard',       'Citibank',          'Mastercard', 0.4,  '#0288D1', '5 years',
     ARRAY['4 mpd on all online purchases (any category) and in-store fashion', 'Travel bookings (airlines, hotels) excluded from 4 mpd online bonus', 'S$1,000/month combined cap on 4 mpd spend (online + in-store fashion)', 'No lounge access'], 'statement', 1, 'miles', NULL),
  ('00000000-0000-0000-0001-000000000018', 'PRVI Miles Mastercard',    'UOB',               'Mastercard', 1.4,  '#00427E', '2 years',
     ARRAY['2.4 mpd on all foreign currency spend (no minimum spend, uncapped)', '8 mpd on Agoda and Expedia hotels (via UOB Travel portal)', '3 mpd on Expedia flights (via UOB Travel portal)', '3 mpd on IDR/MYR/THB/VND foreign currency spend'], 'calendar', 5, 'miles', NULL),
  ('00000000-0000-0000-0001-000000000019', 'KrisFlyer Ascend',         'American Express',  'Amex',       1.2,  '#C9A84C', 'No expiry',
     ARRAY['2 mpd on all foreign currency spend (no minimum spend, uncapped)', '2 complimentary hotel stays at Crowne Plaza Changi Airport per year', 'S$0 conversion fee — miles credited directly to KrisFlyer account'], 'calendar', 1, 'miles', NULL),
  ('00000000-0000-0000-0001-000000000020', 'Cash / Debit',             'Cash',              'Debit',      0,    '#6B7280', NULL,
     ARRAY['Use for cash or debit card transactions — spend is tracked but no rewards earned'], 'calendar', 1, 'debit', NULL),
  ('00000000-0000-0000-0001-000000000021', 'Simply Cash',              'Standard Chartered','Visa',       0,    '#0B5CAB', NULL,
     ARRAY['1.5% cashback on all spend, uncapped, no minimum spend'], 'calendar', 1, 'cashback', 0.015),
  ('00000000-0000-0000-0001-000000000022', 'Absolute Cashback',        'UOB',               'Amex',       0,    '#00427E', NULL,
     ARRAY['1.7% cashback on all spend, uncapped, no minimum spend'], 'calendar', 1, 'cashback', 0.017),
  ('00000000-0000-0000-0001-000000000023', 'Citi Cash Back+',          'Citibank',          'Mastercard', 0,    '#D42B28', NULL,
     ARRAY['1.6% cashback on all spend, uncapped, no minimum spend'], 'calendar', 1, 'cashback', 0.016),
  ('00000000-0000-0000-0001-000000000024', 'Mari Credit Card',         'MariBank',          'Mastercard', 0,    '#00B3A4', NULL,
     ARRAY['1.5% cashback on all spend, uncapped, no minimum spend'], 'calendar', 1, 'cashback', 0.015)
ON CONFLICT (id) DO NOTHING;


-- ─────────────────────────────────────────────────────────────────────────────
-- MCC eligibility (consolidated from migrations 044–053)
-- Requires the mcc_mode column (migration 046), the card_mcc_eligibility table
-- (migration 044) and its payment_channel column (migration 053). Seeded here too
-- so a fresh install has MCC data without depending on the data migrations' run
-- order (those set mcc_mode by name and no-op if run before the cards are
-- inserted). Extra MCC descriptions live in mcc_seed.sql. Idempotent: mode set by
-- id, rows replaced per card.
-- ─────────────────────────────────────────────────────────────────────────────

-- mcc_mode per card
UPDATE card_library SET mcc_mode = 'whitelist' WHERE id IN (
  '00000000-0000-0000-0001-000000000011',  -- UOB Lady's Solitaire
  '00000000-0000-0000-0001-000000000010',  -- UOB Lady's Card
  '00000000-0000-0000-0001-000000000014',  -- UOB KrisFlyer Visa
  '00000000-0000-0000-0001-000000000015'   -- HSBC Revolution
);
UPDATE card_library SET mcc_mode = 'blacklist' WHERE id IN (
  '00000000-0000-0000-0001-000000000017',  -- Citi Rewards
  '00000000-0000-0000-0001-000000000002'   -- DBS Woman's World
);
UPDATE card_library SET mcc_mode = 'hybrid' WHERE id = '00000000-0000-0000-0001-000000000013';  -- UOB Preferred Platinum (channel-dependent)

-- ── UOB Lady's Solitaire (...011): whitelist, grouped by bonus category ───────
DELETE FROM card_mcc_eligibility WHERE card_id = '00000000-0000-0000-0001-000000000011';
INSERT INTO card_mcc_eligibility (card_id, category_label, mcc_start, mcc_end, note) VALUES
  ('00000000-0000-0000-0001-000000000011', 'Beauty', '5912', '5912', NULL),
  ('00000000-0000-0000-0001-000000000011', 'Beauty', '5977', '5977', NULL),
  ('00000000-0000-0000-0001-000000000011', 'Beauty', '7230', '7230', NULL),
  ('00000000-0000-0000-0001-000000000011', 'Beauty', '7231', '7231', NULL),
  ('00000000-0000-0000-0001-000000000011', 'Beauty', '7297', '7297', NULL),
  ('00000000-0000-0000-0001-000000000011', 'Beauty', '7298', '7298', NULL),
  ('00000000-0000-0000-0001-000000000011', 'Dining', '5811', '5811', NULL),
  ('00000000-0000-0000-0001-000000000011', 'Dining', '5812', '5812', NULL),
  ('00000000-0000-0000-0001-000000000011', 'Dining', '5814', '5814', NULL),
  ('00000000-0000-0000-0001-000000000011', 'Dining', '5499', '5499', NULL),
  ('00000000-0000-0000-0001-000000000011', 'Entertainment', '5813', '5813', NULL),
  ('00000000-0000-0000-0001-000000000011', 'Entertainment', '7832', '7832', NULL),
  ('00000000-0000-0000-0001-000000000011', 'Entertainment', '7922', '7922', NULL),
  ('00000000-0000-0000-0001-000000000011', 'Family', '5411', '5411', NULL),
  ('00000000-0000-0000-0001-000000000011', 'Family', '5641', '5641', NULL),
  ('00000000-0000-0000-0001-000000000011', 'Fashion', '5311', '5311', NULL),
  ('00000000-0000-0000-0001-000000000011', 'Fashion', '5611', '5611', NULL),
  ('00000000-0000-0000-0001-000000000011', 'Fashion', '5621', '5621', NULL),
  ('00000000-0000-0000-0001-000000000011', 'Fashion', '5631', '5631', NULL),
  ('00000000-0000-0000-0001-000000000011', 'Fashion', '5651', '5651', NULL),
  ('00000000-0000-0000-0001-000000000011', 'Fashion', '5655', '5655', NULL),
  ('00000000-0000-0000-0001-000000000011', 'Fashion', '5661', '5661', NULL),
  ('00000000-0000-0000-0001-000000000011', 'Fashion', '5691', '5691', NULL),
  ('00000000-0000-0000-0001-000000000011', 'Fashion', '5699', '5699', NULL),
  ('00000000-0000-0000-0001-000000000011', 'Fashion', '5948', '5948', NULL),
  ('00000000-0000-0000-0001-000000000011', 'Transport', '4111', '4111', NULL),
  ('00000000-0000-0000-0001-000000000011', 'Transport', '4121', '4121', NULL),
  ('00000000-0000-0000-0001-000000000011', 'Transport', '4789', '4789', NULL),
  ('00000000-0000-0000-0001-000000000011', 'Transport', '5541', '5541', NULL),
  ('00000000-0000-0000-0001-000000000011', 'Transport', '5542', '5542', NULL),
  ('00000000-0000-0000-0001-000000000011', 'Travel', '3000', '3299', 'Airlines'),
  ('00000000-0000-0000-0001-000000000011', 'Travel', '3500', '3999', 'Hotels & car rental'),
  ('00000000-0000-0000-0001-000000000011', 'Travel', '4411', '4411', NULL),
  ('00000000-0000-0000-0001-000000000011', 'Travel', '4511', '4511', NULL),
  ('00000000-0000-0000-0001-000000000011', 'Travel', '4582', '4582', NULL),
  ('00000000-0000-0000-0001-000000000011', 'Travel', '4722', '4722', NULL),
  ('00000000-0000-0000-0001-000000000011', 'Travel', '5309', '5309', NULL),
  ('00000000-0000-0000-0001-000000000011', 'Travel', '7011', '7011', NULL);

-- ── UOB Lady's Card (...010): whitelist, mirrors Lady's Solitaire ─────────────
DELETE FROM card_mcc_eligibility WHERE card_id = '00000000-0000-0000-0001-000000000010';
INSERT INTO card_mcc_eligibility (card_id, category_label, mcc_start, mcc_end, note)
SELECT '00000000-0000-0000-0001-000000000010', category_label, mcc_start, mcc_end, note
FROM card_mcc_eligibility
WHERE card_id = '00000000-0000-0000-0001-000000000011';

-- ── UOB KrisFlyer Visa (...014): whitelist ───────────────────────────────────
DELETE FROM card_mcc_eligibility WHERE card_id = '00000000-0000-0000-0001-000000000014';
INSERT INTO card_mcc_eligibility (card_id, category_label, mcc_start, mcc_end, note) VALUES
  ('00000000-0000-0000-0001-000000000014', 'Dining', '5812', '5812', NULL),
  ('00000000-0000-0000-0001-000000000014', 'Dining', '5813', '5813', NULL),
  ('00000000-0000-0000-0001-000000000014', 'Dining', '5814', '5814', NULL),
  ('00000000-0000-0000-0001-000000000014', 'Transport', '4121', '4121', 'Taxis / ride-hailing (SimplyGo taps also qualify)'),
  ('00000000-0000-0000-0001-000000000014', 'Online Shopping', '4816', '4816', NULL),
  ('00000000-0000-0000-0001-000000000014', 'Online Shopping', '5262', '5262', NULL),
  ('00000000-0000-0000-0001-000000000014', 'Online Shopping', '5306', '5306', NULL),
  ('00000000-0000-0000-0001-000000000014', 'Online Shopping', '5309', '5311', 'Duty free / discount / department stores'),
  ('00000000-0000-0000-0001-000000000014', 'Online Shopping', '5331', '5331', NULL),
  ('00000000-0000-0000-0001-000000000014', 'Online Shopping', '5399', '5399', NULL),
  ('00000000-0000-0000-0001-000000000014', 'Online Shopping', '5611', '5611', NULL),
  ('00000000-0000-0000-0001-000000000014', 'Online Shopping', '5621', '5621', NULL),
  ('00000000-0000-0000-0001-000000000014', 'Online Shopping', '5631', '5631', NULL),
  ('00000000-0000-0000-0001-000000000014', 'Online Shopping', '5641', '5641', NULL),
  ('00000000-0000-0000-0001-000000000014', 'Online Shopping', '5651', '5651', NULL),
  ('00000000-0000-0000-0001-000000000014', 'Online Shopping', '5661', '5661', NULL),
  ('00000000-0000-0000-0001-000000000014', 'Online Shopping', '5691', '5691', NULL),
  ('00000000-0000-0000-0001-000000000014', 'Online Shopping', '5699', '5699', NULL),
  ('00000000-0000-0000-0001-000000000014', 'Online Shopping', '5732', '5732', NULL),
  ('00000000-0000-0000-0001-000000000014', 'Online Shopping', '5733', '5733', NULL),
  ('00000000-0000-0000-0001-000000000014', 'Online Shopping', '5735', '5735', NULL),
  ('00000000-0000-0000-0001-000000000014', 'Online Shopping', '5912', '5912', NULL),
  ('00000000-0000-0000-0001-000000000014', 'Online Shopping', '5942', '5942', NULL),
  ('00000000-0000-0000-0001-000000000014', 'Online Shopping', '5944', '5949', 'Jewelry, toys, cameras, gifts, leather goods'),
  ('00000000-0000-0000-0001-000000000014', 'Online Shopping', '5999', '5999', NULL),
  ('00000000-0000-0000-0001-000000000014', 'Online Shopping', '7278', '7278', 'Shopee / Lazada / Qoo10');

-- ── HSBC Revolution (...015): whitelist (flat list) ──────────────────────────
DELETE FROM card_mcc_eligibility WHERE card_id = '00000000-0000-0000-0001-000000000015';
INSERT INTO card_mcc_eligibility (card_id, category_label, mcc_start, mcc_end, note) VALUES
  ('00000000-0000-0000-0001-000000000015', NULL, '5441', '5441', NULL),
  ('00000000-0000-0000-0001-000000000015', NULL, '5462', '5462', NULL),
  ('00000000-0000-0000-0001-000000000015', NULL, '5811', '5811', NULL),
  ('00000000-0000-0000-0001-000000000015', NULL, '5812', '5812', NULL),
  ('00000000-0000-0000-0001-000000000015', NULL, '5813', '5813', NULL),
  ('00000000-0000-0000-0001-000000000015', NULL, '4816', '4816', NULL),
  ('00000000-0000-0000-0001-000000000015', NULL, '5045', '5045', NULL),
  ('00000000-0000-0000-0001-000000000015', NULL, '5262', '5262', NULL),
  ('00000000-0000-0000-0001-000000000015', NULL, '5309', '5309', NULL),
  ('00000000-0000-0000-0001-000000000015', NULL, '5310', '5310', NULL),
  ('00000000-0000-0000-0001-000000000015', NULL, '5311', '5311', NULL),
  ('00000000-0000-0000-0001-000000000015', NULL, '5331', '5331', NULL),
  ('00000000-0000-0000-0001-000000000015', NULL, '5399', '5399', NULL),
  ('00000000-0000-0000-0001-000000000015', NULL, '5611', '5611', NULL),
  ('00000000-0000-0000-0001-000000000015', NULL, '5621', '5621', NULL),
  ('00000000-0000-0000-0001-000000000015', NULL, '5631', '5631', NULL),
  ('00000000-0000-0000-0001-000000000015', NULL, '5641', '5641', NULL),
  ('00000000-0000-0000-0001-000000000015', NULL, '5651', '5651', NULL),
  ('00000000-0000-0000-0001-000000000015', NULL, '5655', '5655', NULL),
  ('00000000-0000-0000-0001-000000000015', NULL, '5661', '5661', NULL),
  ('00000000-0000-0000-0001-000000000015', NULL, '5691', '5691', NULL),
  ('00000000-0000-0000-0001-000000000015', NULL, '5699', '5699', NULL),
  ('00000000-0000-0000-0001-000000000015', NULL, '5732', '5732', NULL),
  ('00000000-0000-0000-0001-000000000015', NULL, '5733', '5733', NULL),
  ('00000000-0000-0000-0001-000000000015', NULL, '5734', '5734', NULL),
  ('00000000-0000-0000-0001-000000000015', NULL, '5735', '5735', NULL),
  ('00000000-0000-0000-0001-000000000015', NULL, '5912', '5912', NULL),
  ('00000000-0000-0000-0001-000000000015', NULL, '5942', '5942', NULL),
  ('00000000-0000-0000-0001-000000000015', NULL, '5944', '5944', NULL),
  ('00000000-0000-0000-0001-000000000015', NULL, '5945', '5945', NULL),
  ('00000000-0000-0000-0001-000000000015', NULL, '5946', '5946', NULL),
  ('00000000-0000-0000-0001-000000000015', NULL, '5947', '5947', NULL),
  ('00000000-0000-0000-0001-000000000015', NULL, '5948', '5948', NULL),
  ('00000000-0000-0000-0001-000000000015', NULL, '5949', '5949', NULL),
  ('00000000-0000-0000-0001-000000000015', NULL, '5964', '5969', 'Direct marketing'),
  ('00000000-0000-0000-0001-000000000015', NULL, '5970', '5970', NULL),
  ('00000000-0000-0000-0001-000000000015', NULL, '5992', '5992', NULL),
  ('00000000-0000-0000-0001-000000000015', NULL, '5999', '5999', NULL),
  ('00000000-0000-0000-0001-000000000015', NULL, '4121', '4121', NULL),
  ('00000000-0000-0000-0001-000000000015', NULL, '7997', '7997', NULL),
  ('00000000-0000-0000-0001-000000000015', NULL, '3000', '3350', 'Airlines'),
  ('00000000-0000-0000-0001-000000000015', NULL, '4511', '4511', 'Airlines'),
  ('00000000-0000-0000-0001-000000000015', NULL, '3351', '3500', 'Car rental'),
  ('00000000-0000-0000-0001-000000000015', NULL, '3501', '3999', 'Lodging'),
  ('00000000-0000-0000-0001-000000000015', NULL, '7011', '7011', 'Lodging'),
  ('00000000-0000-0000-0001-000000000015', NULL, '4411', '4411', 'Cruise lines');

-- ── Citi Rewards (...017): blacklist (excluded MCCs) ─────────────────────────
DELETE FROM card_mcc_eligibility WHERE card_id = '00000000-0000-0000-0001-000000000017';
INSERT INTO card_mcc_eligibility (card_id, category_label, mcc_start, mcc_end, note) VALUES
  ('00000000-0000-0000-0001-000000000017', NULL, '3000', '3350', 'Airlines'),
  ('00000000-0000-0000-0001-000000000017', NULL, '4511', '4511', 'Airlines'),
  ('00000000-0000-0000-0001-000000000017', NULL, '3351', '3500', 'Car rental'),
  ('00000000-0000-0000-0001-000000000017', NULL, '7512', '7512', 'Car rental'),
  ('00000000-0000-0000-0001-000000000017', NULL, '3501', '3999', 'Lodging'),
  ('00000000-0000-0000-0001-000000000017', NULL, '7011', '7011', 'Lodging'),
  ('00000000-0000-0000-0001-000000000017', NULL, '4111', '4111', 'Passenger transport'),
  ('00000000-0000-0000-0001-000000000017', NULL, '4112', '4112', 'Passenger transport'),
  ('00000000-0000-0000-0001-000000000017', NULL, '4789', '4789', 'Passenger transport'),
  ('00000000-0000-0000-0001-000000000017', NULL, '4411', '4411', 'Cruise lines'),
  ('00000000-0000-0000-0001-000000000017', NULL, '4722', '4722', 'Travel agencies'),
  ('00000000-0000-0000-0001-000000000017', NULL, '4723', '4723', 'Travel agencies'),
  ('00000000-0000-0000-0001-000000000017', NULL, '5962', '5962', 'Direct marketing (travel)'),
  ('00000000-0000-0000-0001-000000000017', NULL, '7012', '7012', 'Timeshares'),
  ('00000000-0000-0000-0001-000000000017', NULL, '8211', '8299', 'Education'),
  ('00000000-0000-0000-0001-000000000017', NULL, '8398', '8398', 'Donations'),
  ('00000000-0000-0000-0001-000000000017', NULL, '9000', '9999', 'Government services'),
  ('00000000-0000-0000-0001-000000000017', NULL, '6300', '6300', 'Insurance'),
  ('00000000-0000-0000-0001-000000000017', NULL, '8651', '8661', 'Professional services & membership'),
  ('00000000-0000-0000-0001-000000000017', NULL, '6529', '6540', 'Quasi-cash (GrabPay/YouTrip top-ups)'),
  ('00000000-0000-0000-0001-000000000017', NULL, '6513', '6513', 'Real estate'),
  ('00000000-0000-0000-0001-000000000017', NULL, '4900', '4900', 'Utilities');

-- ── DBS Woman's World (...002): blacklist, exact singles ─────────────────────
DELETE FROM card_mcc_eligibility WHERE card_id = '00000000-0000-0000-0001-000000000002';
INSERT INTO card_mcc_eligibility (card_id, category_label, mcc_start, mcc_end, note)
SELECT '00000000-0000-0000-0001-000000000002', NULL, code, code, NULL
FROM (VALUES
  ('4784'),('4829'),('4900'),('5047'),('5199'),('5960'),('5993'),
  ('6010'),('6011'),('6012'),('6050'),('6051'),('6211'),('6300'),('6381'),('6399'),('6513'),
  ('6529'),('6530'),('6534'),('6540'),
  ('7349'),('7511'),('7523'),('7995'),
  ('8062'),('8211'),('8220'),('8241'),('8244'),('8249'),('8299'),('8398'),('8651'),('8661'),('8699'),('8999'),
  ('9211'),('9222'),('9223'),('9311'),('9399'),('9402'),('9405')
) AS t(code);

-- ── UOB Preferred Platinum Visa (...013): hybrid ─────────────────────────────
-- Online = whitelist; contactless = all MCCs; null-channel rows = exclusions (both).
DELETE FROM card_mcc_eligibility WHERE card_id = '00000000-0000-0000-0001-000000000013';
INSERT INTO card_mcc_eligibility (card_id, category_label, mcc_start, mcc_end, note, payment_channel) VALUES
  -- Online bonus whitelist
  ('00000000-0000-0000-0001-000000000013', 'Department Stores & Retail', '4816', '4816', NULL, 'online'),
  ('00000000-0000-0000-0001-000000000013', 'Department Stores & Retail', '5262', '5262', NULL, 'online'),
  ('00000000-0000-0000-0001-000000000013', 'Department Stores & Retail', '5306', '5306', NULL, 'online'),
  ('00000000-0000-0000-0001-000000000013', 'Department Stores & Retail', '5309', '5311', NULL, 'online'),
  ('00000000-0000-0000-0001-000000000013', 'Department Stores & Retail', '5331', '5331', NULL, 'online'),
  ('00000000-0000-0000-0001-000000000013', 'Department Stores & Retail', '5399', '5399', NULL, 'online'),
  ('00000000-0000-0000-0001-000000000013', 'Department Stores & Retail', '5611', '5611', NULL, 'online'),
  ('00000000-0000-0000-0001-000000000013', 'Department Stores & Retail', '5621', '5621', NULL, 'online'),
  ('00000000-0000-0000-0001-000000000013', 'Department Stores & Retail', '5631', '5631', NULL, 'online'),
  ('00000000-0000-0000-0001-000000000013', 'Department Stores & Retail', '5641', '5641', NULL, 'online'),
  ('00000000-0000-0000-0001-000000000013', 'Department Stores & Retail', '5651', '5651', NULL, 'online'),
  ('00000000-0000-0000-0001-000000000013', 'Department Stores & Retail', '5661', '5661', NULL, 'online'),
  ('00000000-0000-0000-0001-000000000013', 'Department Stores & Retail', '5691', '5691', NULL, 'online'),
  ('00000000-0000-0000-0001-000000000013', 'Department Stores & Retail', '5699', '5699', NULL, 'online'),
  ('00000000-0000-0000-0001-000000000013', 'Department Stores & Retail', '5732', '5735', NULL, 'online'),
  ('00000000-0000-0000-0001-000000000013', 'Department Stores & Retail', '5912', '5912', NULL, 'online'),
  ('00000000-0000-0000-0001-000000000013', 'Department Stores & Retail', '5942', '5942', NULL, 'online'),
  ('00000000-0000-0000-0001-000000000013', 'Department Stores & Retail', '5944', '5949', NULL, 'online'),
  ('00000000-0000-0000-0001-000000000013', 'Department Stores & Retail', '5964', '5964', NULL, 'online'),
  ('00000000-0000-0000-0001-000000000013', 'Department Stores & Retail', '5966', '5970', NULL, 'online'),
  ('00000000-0000-0000-0001-000000000013', 'Department Stores & Retail', '5992', '5992', NULL, 'online'),
  ('00000000-0000-0000-0001-000000000013', 'Department Stores & Retail', '5999', '5999', NULL, 'online'),
  ('00000000-0000-0000-0001-000000000013', 'Supermarkets / Dining / Food Delivery', '5333', '5333', NULL, 'online'),
  ('00000000-0000-0000-0001-000000000013', 'Supermarkets / Dining / Food Delivery', '5411', '5411', NULL, 'online'),
  ('00000000-0000-0000-0001-000000000013', 'Supermarkets / Dining / Food Delivery', '5441', '5441', NULL, 'online'),
  ('00000000-0000-0000-0001-000000000013', 'Supermarkets / Dining / Food Delivery', '5462', '5462', NULL, 'online'),
  ('00000000-0000-0000-0001-000000000013', 'Supermarkets / Dining / Food Delivery', '5499', '5499', NULL, 'online'),
  ('00000000-0000-0000-0001-000000000013', 'Supermarkets / Dining / Food Delivery', '5811', '5812', NULL, 'online'),
  ('00000000-0000-0000-0001-000000000013', 'Supermarkets / Dining / Food Delivery', '5814', '5814', NULL, 'online'),
  ('00000000-0000-0000-0001-000000000013', 'Supermarkets / Dining / Food Delivery', '8012', '8012', NULL, 'online'),
  ('00000000-0000-0000-0001-000000000013', 'Supermarkets / Dining / Food Delivery', '9751', '9751', NULL, 'online'),
  ('00000000-0000-0000-0001-000000000013', 'Entertainment & Ticketing', '7278', '7278', NULL, 'online'),
  ('00000000-0000-0000-0001-000000000013', 'Entertainment & Ticketing', '7832', '7832', NULL, 'online'),
  ('00000000-0000-0000-0001-000000000013', 'Entertainment & Ticketing', '7841', '7841', NULL, 'online'),
  ('00000000-0000-0000-0001-000000000013', 'Entertainment & Ticketing', '7922', '7922', NULL, 'online'),
  ('00000000-0000-0000-0001-000000000013', 'Entertainment & Ticketing', '7991', '7991', NULL, 'online'),
  ('00000000-0000-0000-0001-000000000013', 'Entertainment & Ticketing', '7996', '7996', NULL, 'online'),
  ('00000000-0000-0000-0001-000000000013', 'Entertainment & Ticketing', '7998', '7999', NULL, 'online'),
  -- Exclusions (both channels)
  ('00000000-0000-0000-0001-000000000013', NULL, '4829', '4829', 'Money transfer', NULL),
  ('00000000-0000-0000-0001-000000000013', NULL, '4900', '4900', 'Utilities', NULL),
  ('00000000-0000-0000-0001-000000000013', NULL, '5199', '5199', 'Nondurable goods', NULL),
  ('00000000-0000-0000-0001-000000000013', NULL, '5960', '5960', 'Insurance', NULL),
  ('00000000-0000-0000-0001-000000000013', NULL, '5965', '5965', 'Direct marketing', NULL),
  ('00000000-0000-0000-0001-000000000013', NULL, '5993', '5993', 'Cigar stores', NULL),
  ('00000000-0000-0000-0001-000000000013', NULL, '6012', '6012', 'Financial institutions', NULL),
  ('00000000-0000-0000-0001-000000000013', NULL, '6050', '6050', 'Quasi cash', NULL),
  ('00000000-0000-0000-0001-000000000013', NULL, '6051', '6051', 'Crypto / foreign currency', NULL),
  ('00000000-0000-0000-0001-000000000013', NULL, '6211', '6211', 'Securities / brokerage', NULL),
  ('00000000-0000-0000-0001-000000000013', NULL, '6300', '6300', 'Insurance', NULL),
  ('00000000-0000-0000-0001-000000000013', NULL, '6513', '6513', 'Rent', NULL),
  ('00000000-0000-0000-0001-000000000013', NULL, '6529', '6530', 'Stored value load', NULL),
  ('00000000-0000-0000-0001-000000000013', NULL, '6534', '6534', 'Money transfer', NULL),
  ('00000000-0000-0000-0001-000000000013', NULL, '6540', '6540', 'Stored value load', NULL),
  ('00000000-0000-0000-0001-000000000013', NULL, '7349', '7349', 'Property management', NULL),
  ('00000000-0000-0000-0001-000000000013', NULL, '7511', '7511', 'Truck stops', NULL),
  ('00000000-0000-0000-0001-000000000013', NULL, '7523', '7523', 'Parking', NULL),
  ('00000000-0000-0000-0001-000000000013', NULL, '8062', '8062', 'Hospitals', NULL),
  ('00000000-0000-0000-0001-000000000013', NULL, '8211', '8211', 'Schools', NULL),
  ('00000000-0000-0000-0001-000000000013', NULL, '8220', '8220', 'Universities', NULL),
  ('00000000-0000-0000-0001-000000000013', NULL, '8398', '8398', 'Charities', NULL),
  ('00000000-0000-0000-0001-000000000013', NULL, '8651', '8651', 'Political organisations', NULL),
  ('00000000-0000-0000-0001-000000000013', NULL, '8661', '8661', 'Religious organisations', NULL),
  ('00000000-0000-0000-0001-000000000013', NULL, '8699', '8699', 'Membership organisations', NULL),
  ('00000000-0000-0000-0001-000000000013', NULL, '8999', '8999', 'Professional services', NULL),
  ('00000000-0000-0000-0001-000000000013', NULL, '9211', '9311', 'Government services', NULL),
  ('00000000-0000-0000-0001-000000000013', NULL, '9399', '9399', 'Government services', NULL),
  ('00000000-0000-0000-0001-000000000013', NULL, '9402', '9402', 'Postal services', NULL),
  ('00000000-0000-0000-0001-000000000013', NULL, '9405', '9405', 'Government services', NULL);

-- ─────────────────────────────────────────────────────────────────────────────
-- Bonus rates (effective from 2000-01-01 = "since launch")
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO library_rates (card_id, category_id, mpd, effective_from) VALUES
  -- DBS Altitude Visa — FCY 2.2 mpd; travel bonus removed Aug 2023
  ('00000000-0000-0000-0001-000000000001','00000000-0000-0000-0000-000000000005', 2.2, '2000-01-01'),
  -- DBS Woman's World — FCY 1.2 mpd (wildcard online 4 mpd added separately below)
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
  -- UOB Visa Signature — 4 mpd on overseas FCY; contactless wildcard handled separately below
  ('00000000-0000-0000-0001-000000000012','00000000-0000-0000-0000-000000000005', 4.0, '2000-01-01'),
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
  -- Citi Rewards Mastercard — 4 mpd on fashion in-store (wildcard online 4 mpd added separately below)
  ('00000000-0000-0000-0001-000000000017','00000000-0000-0000-0000-000000000011', 4.0, '2000-01-01'),  -- fashion (011)
  -- UOB PRVI Miles Mastercard — FCY 2.4 mpd (uncapped)
  ('00000000-0000-0000-0001-000000000018','00000000-0000-0000-0000-000000000005', 2.4, '2000-01-01'),
  -- Amex KrisFlyer Ascend — FCY 2.0 mpd (uncapped)
  ('00000000-0000-0000-0001-000000000019','00000000-0000-0000-0000-000000000005', 2.0, '2000-01-01')
ON CONFLICT (card_id, category_id, effective_from) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- Cashback rate overrides (per-category bonus rates for cashback cards)
-- ─────────────────────────────────────────────────────────────────────────────
-- Citi Cash Back+ is a flat-rate card — no per-category overrides needed.

-- ─────────────────────────────────────────────────────────────────────────────
-- Spending caps
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO library_caps (card_id, category_id, cap_period, spend_limit, effective_from) VALUES
  -- DBS Altitude — no caps
  -- DBS Woman's World — S$1,000/month online channel cap added separately below
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
  -- UOB Visa Signature — FCY S$1,200/month; contactless S$1,200/month channel cap added below
  ('00000000-0000-0000-0001-000000000012','00000000-0000-0000-0000-000000000005','monthly', 1200.00,'2000-01-01'),
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
  -- Citi Rewards Mastercard — S$1,000/month online channel cap added below; no fashion cap
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- Combined cap groups
-- Rows with the same cap_group for a card share a single spending limit.
-- Must run after the INSERT above (requires the cap_group column from migration 010).
-- ─────────────────────────────────────────────────────────────────────────────

UPDATE library_caps SET cap_group = 'bonus' WHERE card_id = '00000000-0000-0000-0001-000000000004';  -- SC Journey
UPDATE library_caps SET cap_group = 'bonus' WHERE card_id = '00000000-0000-0000-0001-000000000015';  -- HSBC Revolution
UPDATE library_caps SET cap_group = 'bonus' WHERE card_id = '00000000-0000-0000-0001-000000000016';  -- Maybank XL Rewards
-- Citi Rewards: no cap_group — online channel cap and fashion category cap track separately

-- ─────────────────────────────────────────────────────────────────────────────
-- Minimum spend thresholds
-- Bonus rates are locked until total card spend for the period reaches min_spend.
-- ─────────────────────────────────────────────────────────────────────────────

-- UOB Visa Signature: S$1,000/month total card spend required to unlock 4 mpd
UPDATE library_caps SET min_spend = 1000 WHERE card_id = '00000000-0000-0000-0001-000000000012';

-- Maybank XL Rewards: S$500/month total card spend required to unlock 4 mpd
UPDATE library_caps SET min_spend = 500  WHERE card_id = '00000000-0000-0000-0001-000000000016';

-- ─────────────────────────────────────────────────────────────────────────────
-- Payment channel requirements on bonus rates
-- 'contactless' = must tap to pay; 'online' = must be an online purchase.
-- NULL (default) = any payment method earns the bonus.
-- ─────────────────────────────────────────────────────────────────────────────

-- SC Journey: dining/groceries/transport bonus applies to online SGD transactions only
UPDATE library_rates SET payment_channel = 'online'
WHERE card_id = '00000000-0000-0000-0001-000000000004'
  AND category_id IN (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000008'
  );

-- UOB Preferred Platinum Visa: online shopping → online only
UPDATE library_rates SET payment_channel = 'online'
WHERE card_id = '00000000-0000-0000-0001-000000000013'
  AND category_id = '00000000-0000-0000-0000-000000000004';

-- ─────────────────────────────────────────────────────────────────────────────
-- Default payment channel per card (pre-fills the transaction log form)
-- ─────────────────────────────────────────────────────────────────────────────

UPDATE card_library SET default_payment_channel = 'contactless' WHERE id = '00000000-0000-0000-0001-000000000012';
UPDATE card_library SET default_payment_channel = 'contactless' WHERE id = '00000000-0000-0000-0001-000000000013';
UPDATE card_library SET default_payment_channel = 'online'      WHERE id = '00000000-0000-0000-0001-000000000002';
UPDATE card_library SET default_payment_channel = 'online'      WHERE id = '00000000-0000-0000-0001-000000000004';
UPDATE card_library SET default_payment_channel = 'online'      WHERE id = '00000000-0000-0000-0001-000000000017';  -- Citi Rewards

-- ─────────────────────────────────────────────────────────────────────────────
-- Wildcard contactless rates (null category = any category earns bonus when tapped)
-- Supersedes the per-category contactless transport rates.
-- ─────────────────────────────────────────────────────────────────────────────

DELETE FROM library_rates WHERE card_id = '00000000-0000-0000-0001-000000000012' AND category_id = '00000000-0000-0000-0000-000000000008' AND payment_channel = 'contactless';
DELETE FROM library_rates WHERE card_id = '00000000-0000-0000-0001-000000000013' AND category_id = '00000000-0000-0000-0000-000000000008' AND payment_channel = 'contactless';

-- Petrol category rate/cap removed for UOB Visa Sig — petrol earns 4 mpd via
-- contactless wildcard rate and draws from the shared S$1,200 contactless cap.
DELETE FROM library_rates WHERE card_id = '00000000-0000-0000-0001-000000000012' AND category_id = '00000000-0000-0000-0000-000000000003';
DELETE FROM library_caps  WHERE card_id = '00000000-0000-0000-0001-000000000012' AND category_id = '00000000-0000-0000-0000-000000000003';
UPDATE card_library SET remarks = ARRAY[
  'Requires S$1,000/month total spend to unlock 4 mpd — earns 0.4 mpd base rate otherwise',
  '4 mpd on all tap-to-pay spend (any category, incl. petrol) — S$1,200/month cap',
  '4 mpd on overseas FCY — S$1,200/month cap (separate from contactless pool)'
] WHERE id = '00000000-0000-0000-0001-000000000012';

INSERT INTO library_rates (card_id, category_id, mpd, payment_channel, effective_from)
SELECT '00000000-0000-0000-0001-000000000012', NULL, 4.0, 'contactless', '2000-01-01'
WHERE NOT EXISTS (SELECT 1 FROM library_rates WHERE card_id = '00000000-0000-0000-0001-000000000012' AND category_id IS NULL AND payment_channel = 'contactless');

INSERT INTO library_rates (card_id, category_id, mpd, payment_channel, effective_from)
SELECT '00000000-0000-0000-0001-000000000013', NULL, 4.0, 'contactless', '2000-01-01'
WHERE NOT EXISTS (SELECT 1 FROM library_rates WHERE card_id = '00000000-0000-0000-0001-000000000013' AND category_id IS NULL AND payment_channel = 'contactless');

-- ─────────────────────────────────────────────────────────────────────────────
-- Contactless channel caps (replace per-category transport caps)
-- Only contactless-flagged transactions count toward these caps.
-- ─────────────────────────────────────────────────────────────────────────────

DELETE FROM library_caps WHERE card_id = '00000000-0000-0000-0001-000000000012' AND category_id = '00000000-0000-0000-0000-000000000008';
DELETE FROM library_caps WHERE card_id = '00000000-0000-0000-0001-000000000013' AND category_id = '00000000-0000-0000-0000-000000000008';

INSERT INTO library_caps (card_id, category_id, cap_period, spend_limit, cap_payment_channel, min_spend, effective_from)
SELECT '00000000-0000-0000-0001-000000000012', NULL, 'monthly', 1200.00, 'contactless', 1000.00, '2000-01-01'
WHERE NOT EXISTS (SELECT 1 FROM library_caps WHERE card_id = '00000000-0000-0000-0001-000000000012' AND category_id IS NULL AND cap_payment_channel = 'contactless');

-- Ensure min_spend is set even if the row was inserted before this fix
UPDATE library_caps SET min_spend = 1000
WHERE card_id = '00000000-0000-0000-0001-000000000012'
  AND category_id IS NULL AND cap_payment_channel = 'contactless' AND min_spend IS NULL;

INSERT INTO library_caps (card_id, category_id, cap_period, spend_limit, cap_payment_channel, effective_from)
SELECT '00000000-0000-0000-0001-000000000013', NULL, 'monthly', 600.00, 'contactless', '2000-01-01'
WHERE NOT EXISTS (SELECT 1 FROM library_caps WHERE card_id = '00000000-0000-0000-0001-000000000013' AND category_id IS NULL AND cap_payment_channel = 'contactless');

-- ─────────────────────────────────────────────────────────────────────────────
-- Wildcard online rates (null category = any category earns bonus when paid online)
-- DBS Woman's World and Citi Rewards grant 4 mpd on ALL online purchases.
-- ─────────────────────────────────────────────────────────────────────────────

-- DBS Woman's World: 4 mpd on all online purchases (any category)
DELETE FROM library_rates WHERE card_id = '00000000-0000-0000-0001-000000000002'
  AND category_id = '00000000-0000-0000-0000-000000000004';  -- remove stale Online Shopping rate if present

INSERT INTO library_rates (card_id, category_id, mpd, payment_channel, effective_from)
SELECT '00000000-0000-0000-0001-000000000002', NULL, 4.0, 'online', '2000-01-01'
WHERE NOT EXISTS (
  SELECT 1 FROM library_rates WHERE card_id = '00000000-0000-0000-0001-000000000002'
    AND category_id IS NULL AND payment_channel = 'online'
);

-- Citi Rewards Mastercard: 4 mpd on all online purchases (any category)
DELETE FROM library_rates WHERE card_id = '00000000-0000-0000-0001-000000000017'
  AND category_id = '00000000-0000-0000-0000-000000000004';  -- remove stale Online Shopping rate if present

INSERT INTO library_rates (card_id, category_id, mpd, payment_channel, effective_from)
SELECT '00000000-0000-0000-0001-000000000017', NULL, 4.0, 'online', '2000-01-01'
WHERE NOT EXISTS (
  SELECT 1 FROM library_rates WHERE card_id = '00000000-0000-0000-0001-000000000017'
    AND category_id IS NULL AND payment_channel = 'online'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Online channel caps (tracks all online spend regardless of category)
-- ─────────────────────────────────────────────────────────────────────────────

-- DBS Woman's World: S$1,000/month on all online purchases
DELETE FROM library_caps WHERE card_id = '00000000-0000-0000-0001-000000000002'
  AND category_id = '00000000-0000-0000-0000-000000000004';  -- remove stale Online Shopping cap if present

INSERT INTO library_caps (card_id, category_id, cap_period, spend_limit, cap_payment_channel, effective_from)
SELECT '00000000-0000-0000-0001-000000000002', NULL, 'monthly', 1000.00, 'online', '2000-01-01'
WHERE NOT EXISTS (
  SELECT 1 FROM library_caps WHERE card_id = '00000000-0000-0000-0001-000000000002'
    AND category_id IS NULL AND cap_payment_channel = 'online'
);

-- Citi Rewards: S$1,000/month on all online purchases (fashion earns 4 mpd in-store with no separate cap)
DELETE FROM library_caps WHERE card_id = '00000000-0000-0000-0001-000000000017'
  AND category_id IN (
    '00000000-0000-0000-0000-000000000004',  -- stale Online Shopping cap
    '00000000-0000-0000-0000-000000000011'   -- fashion cap (removed — dashboard shows Online only)
  );

INSERT INTO library_caps (card_id, category_id, cap_period, spend_limit, cap_payment_channel, effective_from)
SELECT '00000000-0000-0000-0001-000000000017', NULL, 'monthly', 1000.00, 'online', '2000-01-01'
WHERE NOT EXISTS (
  SELECT 1 FROM library_caps WHERE card_id = '00000000-0000-0000-0001-000000000017'
    AND category_id IS NULL AND cap_payment_channel = 'online'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Earn increment corrections (idempotent — re-running applies updates)
-- HSBC and Citibank award miles per $1 block; all other banks use $5 blocks.
-- ─────────────────────────────────────────────────────────────────────────────

UPDATE card_library SET earn_increment = 5 WHERE bank NOT IN ('HSBC', 'Citibank');
UPDATE card_library SET earn_increment = 1 WHERE bank IN ('HSBC', 'Citibank');
