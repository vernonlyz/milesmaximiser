-- Citi Rewards (card ...017): extend the BLACKLIST with MCCs from Citi's published
-- exclusion list that were not yet seeded (migration 048 covered the travel /
-- education / government / quasi-cash 6529–6540 blocks). These add the scattered
-- financial, quasi-cash, parking, betting, hospital and misc exclusions.
-- Appended (not replacing) the existing rows; idempotent for the added codes.

-- Missing MCC descriptions (idempotent — keep any existing rows untouched).
INSERT INTO mcc_catalogue (code, description, default_category_id) VALUES
  ('4829', 'Wire Transfer Money Orders (WTMOs)',                                NULL),
  ('5199', 'Nondurable Goods (Not Elsewhere Classified)',                       NULL),
  ('5960', 'Direct Marketing - Insurance Services',                             NULL),
  ('5993', 'Cigar Stores and Stands',                                           NULL),
  ('6012', 'Financial Institutions - Merchandise, Services, and Debt Repayment',NULL),
  ('6050', 'Quasi Cash - Financial Institutions, Merchandise, Services',        NULL),
  ('6051', 'Non-Financial Institutions - Foreign Currency, Money Orders, Stored Value', NULL),
  ('6211', 'Securities - Brokers and Dealers',                                  NULL),
  ('7349', 'Cleaning and Maintenance, Janitorial Services',                     NULL),
  ('7511', 'Quasi Cash - Truck Stop Transactions',                             NULL),
  ('7523', 'Parking Lots, Parking Meters and Garages',                          NULL),
  ('7800', 'Government-Owned Lotteries (US Region only)',                        NULL),
  ('7995', 'Betting, Lottery Tickets, Casino Gaming Chips, Off-Track Betting',   NULL),
  ('8062', 'Hospitals',                                                         NULL)
ON CONFLICT (code) DO NOTHING;

-- Extra exclusion rows for Citi Rewards. Delete-then-insert only the codes added
-- here so this can be re-run without duplicating (and without touching the
-- migration-048 rows). 6050–6051 collapse into one range.
DELETE FROM card_mcc_eligibility
  WHERE card_id = '00000000-0000-0000-0001-000000000017'
    AND mcc_start IN ('4829','5199','5960','5993','6012','6050','6211','7349','7511','7523','7800','7995','8062');

INSERT INTO card_mcc_eligibility (card_id, category_label, mcc_start, mcc_end, note) VALUES
  ('00000000-0000-0000-0001-000000000017', NULL, '4829', '4829', 'Wire transfer money orders'),
  ('00000000-0000-0000-0001-000000000017', NULL, '5199', '5199', 'Nondurable goods (NEC)'),
  ('00000000-0000-0000-0001-000000000017', NULL, '5960', '5960', 'Direct marketing (insurance)'),
  ('00000000-0000-0000-0001-000000000017', NULL, '5993', '5993', 'Cigar stores'),
  ('00000000-0000-0000-0001-000000000017', NULL, '6012', '6012', 'Financial institutions (debt repayment)'),
  ('00000000-0000-0000-0001-000000000017', NULL, '6050', '6051', 'Quasi-cash / foreign currency / stored value'),
  ('00000000-0000-0000-0001-000000000017', NULL, '6211', '6211', 'Securities brokers & dealers'),
  ('00000000-0000-0000-0001-000000000017', NULL, '7349', '7349', 'Cleaning & janitorial services'),
  ('00000000-0000-0000-0001-000000000017', NULL, '7511', '7511', 'Quasi-cash (truck stop)'),
  ('00000000-0000-0000-0001-000000000017', NULL, '7523', '7523', 'Parking lots & garages'),
  ('00000000-0000-0000-0001-000000000017', NULL, '7800', '7800', 'Government-owned lotteries'),
  ('00000000-0000-0000-0001-000000000017', NULL, '7995', '7995', 'Betting & lottery'),
  ('00000000-0000-0000-0001-000000000017', NULL, '8062', '8062', 'Hospitals');
