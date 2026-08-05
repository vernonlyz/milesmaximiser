-- Reconcile Maybank XL Rewards (card ...016) whitelist with the published
-- Dine / Shop / Travel / Play MCC table. Corrects the earlier seed, which had an
-- over-broad Shop list (electronics/books/jewellery/etc.) and wrong Travel/Play
-- codes. Full replace of ...016's rows. (mcc_mode already 'whitelist'.)
DELETE FROM card_mcc_eligibility WHERE card_id = '00000000-0000-0000-0001-000000000016';
INSERT INTO card_mcc_eligibility (card_id, category_label, mcc_start, mcc_end, note) VALUES
  -- Dine (Caterers, Restaurants, Fast Food, Bakeries, Food Delivery)
  ('00000000-0000-0000-0001-000000000016', 'Dine', '5462', '5462', NULL),
  ('00000000-0000-0000-0001-000000000016', 'Dine', '5811', '5812', NULL),
  ('00000000-0000-0000-0001-000000000016', 'Dine', '5814', '5814', NULL),
  -- Shop (Apparel, Department Store, Sports/Riding Apparel, Sporting Goods)
  ('00000000-0000-0000-0001-000000000016', 'Shop', '5262', '5262', NULL),
  ('00000000-0000-0000-0001-000000000016', 'Shop', '5310', '5311', NULL),
  ('00000000-0000-0000-0001-000000000016', 'Shop', '5331', '5331', NULL),
  ('00000000-0000-0000-0001-000000000016', 'Shop', '5399', '5399', NULL),
  ('00000000-0000-0000-0001-000000000016', 'Shop', '5621', '5621', NULL),
  ('00000000-0000-0000-0001-000000000016', 'Shop', '5631', '5631', NULL),
  ('00000000-0000-0000-0001-000000000016', 'Shop', '5651', '5651', NULL),
  ('00000000-0000-0000-0001-000000000016', 'Shop', '5655', '5655', NULL),
  ('00000000-0000-0000-0001-000000000016', 'Shop', '5661', '5661', NULL),
  ('00000000-0000-0000-0001-000000000016', 'Shop', '5691', '5691', NULL),
  ('00000000-0000-0000-0001-000000000016', 'Shop', '5699', '5699', NULL),
  ('00000000-0000-0000-0001-000000000016', 'Shop', '5941', '5941', NULL),
  -- Travel (Airlines, Travel Agencies)
  ('00000000-0000-0000-0001-000000000016', 'Travel', '3000', '3299', 'Airlines'),
  ('00000000-0000-0000-0001-000000000016', 'Travel', '3300', '3308', 'Airlines'),
  ('00000000-0000-0000-0001-000000000016', 'Travel', '4511', '4511', NULL),
  ('00000000-0000-0000-0001-000000000016', 'Travel', '4722', '4722', 'Travel agencies'),
  ('00000000-0000-0000-0001-000000000016', 'Travel', '7011', '7011', NULL),
  -- Play (Bars, Cable TV, Cinemas, Video Amusement/Arcade, Paid TV)
  ('00000000-0000-0000-0001-000000000016', 'Play', '4899', '4899', NULL),
  ('00000000-0000-0000-0001-000000000016', 'Play', '5813', '5813', NULL),
  ('00000000-0000-0000-0001-000000000016', 'Play', '5815', '5815', NULL),
  ('00000000-0000-0000-0001-000000000016', 'Play', '7832', '7832', NULL),
  ('00000000-0000-0000-0001-000000000016', 'Play', '7993', '7994', NULL);
