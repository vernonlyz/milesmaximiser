-- MCC eligibility (whitelist, ONLINE-scoped) for Standard Chartered Journey (card ...004).
-- The 3 mpd bonus applies only to ONLINE (card-not-present) SGD transactions in the
-- MCCs below — mobile wallets (Apple/Google/Samsung Pay) do NOT count as online, and
-- everything else earns base. Rows carry payment_channel = 'online' so the app only
-- treats them as bonus-eligible on the online channel (contactless/chip → base).
-- SC's retail exclusion list is covered implicitly (not in the whitelist → base), so
-- it is not stored. Non-MCC exclusions (cash advance, balance transfer, instalments,
-- fees, wallet top-ups, quasi-cash) can't be modelled by MCC.

-- Descriptions used below (idempotent).
INSERT INTO mcc_catalogue (code, description, default_category_id) VALUES
  ('5921', 'Package Stores - Beer, Wine, Liquor', '00000000-0000-0000-0000-000000000002')
ON CONFLICT (code) DO NOTHING;

UPDATE card_library SET mcc_mode = 'whitelist'
  WHERE bank = 'Standard Chartered' AND name = 'Journey Credit Card';

DELETE FROM card_mcc_eligibility WHERE card_id = '00000000-0000-0000-0001-000000000004';
INSERT INTO card_mcc_eligibility (card_id, category_label, mcc_start, mcc_end, note, payment_channel) VALUES
  -- Transport
  ('00000000-0000-0000-0001-000000000004', 'Transport', '4111', '4111', NULL, 'online'),
  ('00000000-0000-0000-0001-000000000004', 'Transport', '4121', '4121', NULL, 'online'),
  ('00000000-0000-0000-0001-000000000004', 'Transport', '4411', '4411', 'Cruise lines', 'online'),
  ('00000000-0000-0000-0001-000000000004', 'Transport', '4789', '4789', NULL, 'online'),
  -- Online Grocery / Food Stores
  ('00000000-0000-0000-0001-000000000004', 'Online Grocery / Food', '5411', '5411', NULL, 'online'),
  ('00000000-0000-0000-0001-000000000004', 'Online Grocery / Food', '5462', '5462', NULL, 'online'),
  ('00000000-0000-0000-0001-000000000004', 'Online Grocery / Food', '5499', '5499', NULL, 'online'),
  ('00000000-0000-0000-0001-000000000004', 'Online Grocery / Food', '5921', '5921', NULL, 'online'),
  -- Online Food Delivery
  ('00000000-0000-0000-0001-000000000004', 'Online Food Delivery', '5811', '5812', NULL, 'online'),
  ('00000000-0000-0000-0001-000000000004', 'Online Food Delivery', '5814', '5814', NULL, 'online');
