-- MCC eligibility (blacklist) for DBS Altitude (card ...001).
-- Everything earns DBS Points/miles EXCEPT the MCCs below (money transfer,
-- utilities, finance/quasi-cash, insurance, rent, stored value, gambling,
-- hospitals, education, charities, government, etc.). Non-MCC exclusions (cash
-- advance, balance transfer, fees, Smart Cash, refunds) can't be modelled by MCC.
UPDATE card_library SET mcc_mode = 'blacklist'
  WHERE bank = 'DBS' AND name = 'Altitude Visa Signature';

DELETE FROM card_mcc_eligibility WHERE card_id = '00000000-0000-0000-0001-000000000001';
INSERT INTO card_mcc_eligibility (card_id, category_label, mcc_start, mcc_end, note) VALUES
  ('00000000-0000-0000-0001-000000000001', NULL, '4829', '4829', 'Money transfer'),
  ('00000000-0000-0000-0001-000000000001', NULL, '4900', '4900', 'Utilities'),
  ('00000000-0000-0000-0001-000000000001', NULL, '6012', '6012', 'Financial institutions'),
  ('00000000-0000-0000-0001-000000000001', NULL, '6051', '6051', 'Crypto / quasi cash'),
  ('00000000-0000-0000-0001-000000000001', NULL, '6211', '6211', 'Securities / brokerage'),
  ('00000000-0000-0000-0001-000000000001', NULL, '6300', '6300', 'Insurance'),
  ('00000000-0000-0000-0001-000000000001', NULL, '6381', '6381', 'Insurance premiums'),
  ('00000000-0000-0000-0001-000000000001', NULL, '6399', '6399', 'Insurance services'),
  ('00000000-0000-0000-0001-000000000001', NULL, '6513', '6513', 'Rent'),
  ('00000000-0000-0000-0001-000000000001', NULL, '6529', '6530', 'Stored value load'),
  ('00000000-0000-0000-0001-000000000001', NULL, '6534', '6534', 'Money transfer'),
  ('00000000-0000-0000-0001-000000000001', NULL, '6540', '6540', 'Stored value load'),
  ('00000000-0000-0000-0001-000000000001', NULL, '7523', '7523', 'Parking'),
  ('00000000-0000-0000-0001-000000000001', NULL, '7800', '7800', 'Government lotteries'),
  ('00000000-0000-0000-0001-000000000001', NULL, '7995', '7995', 'Gambling / betting'),
  ('00000000-0000-0000-0001-000000000001', NULL, '8062', '8062', 'Hospitals'),
  ('00000000-0000-0000-0001-000000000001', NULL, '8211', '8211', 'Schools'),
  ('00000000-0000-0000-0001-000000000001', NULL, '8220', '8220', 'Universities'),
  ('00000000-0000-0000-0001-000000000001', NULL, '8241', '8241', 'Correspondence schools'),
  ('00000000-0000-0000-0001-000000000001', NULL, '8244', '8244', 'Business schools'),
  ('00000000-0000-0000-0001-000000000001', NULL, '8249', '8249', 'Trade / vocational schools'),
  ('00000000-0000-0000-0001-000000000001', NULL, '8299', '8299', 'Educational services'),
  ('00000000-0000-0000-0001-000000000001', NULL, '8398', '8398', 'Charities'),
  ('00000000-0000-0000-0001-000000000001', NULL, '8651', '8651', 'Political organisations'),
  ('00000000-0000-0000-0001-000000000001', NULL, '8661', '8661', 'Religious organisations'),
  ('00000000-0000-0000-0001-000000000001', NULL, '8699', '8699', 'Membership organisations'),
  ('00000000-0000-0000-0001-000000000001', NULL, '9211', '9405', 'Government services');
