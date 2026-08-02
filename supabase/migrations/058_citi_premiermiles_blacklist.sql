-- MCC eligibility (blacklist) for Citi PremierMiles (card ...005).
-- Everything earns Citi Miles EXCEPT the MCCs below (money transfer, utilities,
-- finance/quasi-cash, insurance, cash/stored-value, government, education,
-- charities, gambling, etc.). Non-MCC exclusions (cash advance, balance transfer,
-- instalments, fees) can't be modelled by MCC.

-- Descriptions used below (idempotent).
INSERT INTO mcc_catalogue (code, description, default_category_id) VALUES
  ('7800', 'Government-Owned Lotteries', '00000000-0000-0000-0000-000000000010')
ON CONFLICT (code) DO NOTHING;

UPDATE card_library SET mcc_mode = 'blacklist'
  WHERE bank = 'Citibank' AND name = 'PremierMiles Visa';

DELETE FROM card_mcc_eligibility WHERE card_id = '00000000-0000-0000-0001-000000000005';
INSERT INTO card_mcc_eligibility (card_id, category_label, mcc_start, mcc_end, note) VALUES
  ('00000000-0000-0000-0001-000000000005', NULL, '4829', '4829', 'Money transfer'),
  ('00000000-0000-0000-0001-000000000005', NULL, '4900', '4900', 'Utilities'),
  ('00000000-0000-0000-0001-000000000005', NULL, '6012', '6012', 'Financial institutions'),
  ('00000000-0000-0000-0001-000000000005', NULL, '6051', '6051', 'Crypto / quasi cash'),
  ('00000000-0000-0000-0001-000000000005', NULL, '6211', '6211', 'Securities / brokerage'),
  ('00000000-0000-0000-0001-000000000005', NULL, '6300', '6300', 'Insurance'),
  ('00000000-0000-0000-0001-000000000005', NULL, '6381', '6381', 'Insurance premiums'),
  ('00000000-0000-0000-0001-000000000005', NULL, '6399', '6399', 'Insurance services'),
  ('00000000-0000-0000-0001-000000000005', NULL, '6529', '6530', 'Stored value load'),
  ('00000000-0000-0000-0001-000000000005', NULL, '6534', '6534', 'Money transfer'),
  ('00000000-0000-0000-0001-000000000005', NULL, '6540', '6540', 'Stored value load'),
  ('00000000-0000-0000-0001-000000000005', NULL, '7349', '7349', 'Cleaning / janitorial'),
  ('00000000-0000-0000-0001-000000000005', NULL, '7511', '7511', 'Truck stops'),
  ('00000000-0000-0000-0001-000000000005', NULL, '7523', '7523', 'Parking'),
  ('00000000-0000-0000-0001-000000000005', NULL, '7800', '7800', 'Government lotteries'),
  ('00000000-0000-0000-0001-000000000005', NULL, '7995', '7995', 'Gambling / betting'),
  ('00000000-0000-0000-0001-000000000005', NULL, '8062', '8062', 'Hospitals'),
  ('00000000-0000-0000-0001-000000000005', NULL, '8211', '8211', 'Schools'),
  ('00000000-0000-0000-0001-000000000005', NULL, '8220', '8220', 'Universities'),
  ('00000000-0000-0000-0001-000000000005', NULL, '8398', '8398', 'Charities'),
  ('00000000-0000-0000-0001-000000000005', NULL, '8651', '8651', 'Political organisations'),
  ('00000000-0000-0000-0001-000000000005', NULL, '8661', '8661', 'Religious organisations'),
  ('00000000-0000-0000-0001-000000000005', NULL, '8699', '8699', 'Membership organisations'),
  ('00000000-0000-0000-0001-000000000005', NULL, '9211', '9311', 'Government services'),
  ('00000000-0000-0000-0001-000000000005', NULL, '9399', '9399', 'Government services'),
  ('00000000-0000-0000-0001-000000000005', NULL, '9402', '9402', 'Postal services'),
  ('00000000-0000-0000-0001-000000000005', NULL, '9405', '9405', 'Government services');
