-- MCC eligibility (whitelist) for two more UOB cards.
--   • UOB Lady's Card (card ...010)  — same UOB bonus-category MCC definitions as
--     Lady's Solitaire (...011); Lady's Card picks 1 category, Solitaire picks 2,
--     but the eligible-MCC list per category is identical. Mirror ...011's rows.
--   • UOB KrisFlyer Credit Card (card ...014) — 2.4 mpd bonus categories: Dining,
--     Transport, Online Shopping (Online Travel is a merchant list, not MCC-based,
--     so it is not modelled here). Sourced from the card's published category MCCs.

-- ── Missing MCC descriptions used below (idempotent; standard MCC names only) ──
INSERT INTO mcc_catalogue (code, description, default_category_id) VALUES
  ('4816', 'Computer Network / Information Services', '00000000-0000-0000-0000-000000000004'),
  ('5262', 'Marketplaces',                           '00000000-0000-0000-0000-000000000004'),
  ('5310', 'Discount Stores',                        '00000000-0000-0000-0000-000000000004'),
  ('5331', 'Variety Stores',                         '00000000-0000-0000-0000-000000000004'),
  ('5399', 'Miscellaneous General Merchandise',      '00000000-0000-0000-0000-000000000004'),
  ('5732', 'Electronics Stores',                     '00000000-0000-0000-0000-000000000004'),
  ('5733', 'Music Stores - Instruments',            '00000000-0000-0000-0000-000000000004'),
  ('5735', 'Record Stores',                          '00000000-0000-0000-0000-000000000004'),
  ('5942', 'Book Stores',                            '00000000-0000-0000-0000-000000000004'),
  ('5944', 'Jewelry / Watch Stores',                 '00000000-0000-0000-0000-000000000004'),
  ('5945', 'Hobby, Toy and Game Shops',              '00000000-0000-0000-0000-000000000004'),
  ('5946', 'Camera and Photographic Supply Stores',  '00000000-0000-0000-0000-000000000004'),
  ('5947', 'Gift, Card, Novelty and Souvenir Shops', '00000000-0000-0000-0000-000000000004'),
  ('5949', 'Sewing, Needlework and Fabric Stores',   '00000000-0000-0000-0000-000000000004'),
  ('7278', 'Buying and Shopping Services / Clubs',    '00000000-0000-0000-0000-000000000004')
ON CONFLICT (code) DO NOTHING;

-- ── UOB Lady's Card (...010): whitelist, mirroring Lady's Solitaire (...011) ──
UPDATE card_library SET mcc_mode = 'whitelist'
  WHERE bank = 'UOB' AND name = 'Lady''s Card';

DELETE FROM card_mcc_eligibility WHERE card_id = '00000000-0000-0000-0001-000000000010';
INSERT INTO card_mcc_eligibility (card_id, category_label, mcc_start, mcc_end, note)
SELECT '00000000-0000-0000-0001-000000000010', category_label, mcc_start, mcc_end, note
FROM card_mcc_eligibility
WHERE card_id = '00000000-0000-0000-0001-000000000011';

-- ── UOB KrisFlyer Credit Card (...014): whitelist ────────────────────────────
UPDATE card_library SET mcc_mode = 'whitelist'
  WHERE bank = 'UOB' AND name = 'KrisFlyer Visa';

DELETE FROM card_mcc_eligibility WHERE card_id = '00000000-0000-0000-0001-000000000014';
INSERT INTO card_mcc_eligibility (card_id, category_label, mcc_start, mcc_end, note) VALUES
  -- Dining
  ('00000000-0000-0000-0001-000000000014', 'Dining', '5812', '5812', NULL),
  ('00000000-0000-0000-0001-000000000014', 'Dining', '5813', '5813', NULL),
  ('00000000-0000-0000-0001-000000000014', 'Dining', '5814', '5814', NULL),
  -- Transport
  ('00000000-0000-0000-0001-000000000014', 'Transport', '4121', '4121', 'Taxis / ride-hailing (SimplyGo taps also qualify)'),
  -- Online Shopping
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
