-- MCC eligibility (blacklist) for HSBC TravelOne (card ...007).
-- Everything earns HSBC Reward points/miles EXCEPT the MCCs below (money transfer,
-- utilities, finance/quasi-cash, PSP/MoneySend, insurance, rent, stored value,
-- gambling, hospitals, education, charities, government, professional services).
-- Non-MCC exclusions (cash advance, balance transfer, IPP, fees, FX, named
-- money-transfer/ad merchants like CardUp/Google Ads) can't be modelled by MCC.

-- Descriptions used below (idempotent).
INSERT INTO mcc_catalogue (code, description, default_category_id) VALUES
  ('6532', 'Payment Service Provider - Member Payment',   '00000000-0000-0000-0000-000000000010'),
  ('6533', 'Payment Service Provider - Merchant Payment', '00000000-0000-0000-0000-000000000010'),
  ('6536', 'MoneySend (Domestic)',                        '00000000-0000-0000-0000-000000000010'),
  ('6537', 'MoneySend (International)',                    '00000000-0000-0000-0000-000000000010'),
  ('6538', 'MoneySend Funding',                           '00000000-0000-0000-0000-000000000010'),
  ('6555', 'Mastercard Initiated Rebate',                 '00000000-0000-0000-0000-000000000010'),
  ('7299', 'Miscellaneous Personal Services',             '00000000-0000-0000-0000-000000000010'),
  ('7801', 'Online Gambling',                             '00000000-0000-0000-0000-000000000010')
ON CONFLICT (code) DO NOTHING;

UPDATE card_library SET mcc_mode = 'blacklist'
  WHERE bank = 'HSBC' AND name = 'TravelOne Visa';

DELETE FROM card_mcc_eligibility WHERE card_id = '00000000-0000-0000-0001-000000000007';
INSERT INTO card_mcc_eligibility (card_id, category_label, mcc_start, mcc_end, note) VALUES
  ('00000000-0000-0000-0001-000000000007', NULL, '4829', '4829', 'Money transfer'),
  ('00000000-0000-0000-0001-000000000007', NULL, '4900', '4900', 'Utilities'),
  ('00000000-0000-0000-0001-000000000007', NULL, '5199', '5199', 'Nondurable goods'),
  ('00000000-0000-0000-0001-000000000007', NULL, '5960', '5960', 'Insurance (direct marketing)'),
  ('00000000-0000-0000-0001-000000000007', NULL, '6010', '6012', 'Cash disbursement / financial'),
  ('00000000-0000-0000-0001-000000000007', NULL, '6050', '6051', 'Quasi cash / crypto'),
  ('00000000-0000-0000-0001-000000000007', NULL, '6211', '6211', 'Securities / brokerage'),
  ('00000000-0000-0000-0001-000000000007', NULL, '6300', '6300', 'Insurance premiums'),
  ('00000000-0000-0000-0001-000000000007', NULL, '6513', '6513', 'Rent'),
  ('00000000-0000-0000-0001-000000000007', NULL, '6529', '6530', 'Stored value load'),
  ('00000000-0000-0000-0001-000000000007', NULL, '6532', '6534', 'PSP / money transfer'),
  ('00000000-0000-0000-0001-000000000007', NULL, '6536', '6538', 'MoneySend'),
  ('00000000-0000-0000-0001-000000000007', NULL, '6540', '6540', 'Stored value load'),
  ('00000000-0000-0000-0001-000000000007', NULL, '6555', '6555', 'Mastercard rebate'),
  ('00000000-0000-0000-0001-000000000007', NULL, '7299', '7299', 'Other services'),
  ('00000000-0000-0000-0001-000000000007', NULL, '7349', '7349', 'Cleaning / janitorial'),
  ('00000000-0000-0000-0001-000000000007', NULL, '7399', '7399', 'Business services'),
  ('00000000-0000-0000-0001-000000000007', NULL, '7511', '7511', 'Truck stops'),
  ('00000000-0000-0000-0001-000000000007', NULL, '7523', '7523', 'Parking'),
  ('00000000-0000-0000-0001-000000000007', NULL, '7801', '7801', 'Online gambling'),
  ('00000000-0000-0000-0001-000000000007', NULL, '7995', '7995', 'Gambling'),
  ('00000000-0000-0000-0001-000000000007', NULL, '8062', '8062', 'Hospitals'),
  ('00000000-0000-0000-0001-000000000007', NULL, '8211', '8211', 'Schools'),
  ('00000000-0000-0000-0001-000000000007', NULL, '8220', '8220', 'Universities'),
  ('00000000-0000-0000-0001-000000000007', NULL, '8241', '8241', 'Correspondence schools'),
  ('00000000-0000-0000-0001-000000000007', NULL, '8244', '8244', 'Business schools'),
  ('00000000-0000-0000-0001-000000000007', NULL, '8249', '8249', 'Vocational schools'),
  ('00000000-0000-0000-0001-000000000007', NULL, '8299', '8299', 'Educational services'),
  ('00000000-0000-0000-0001-000000000007', NULL, '8398', '8398', 'Charities'),
  ('00000000-0000-0000-0001-000000000007', NULL, '8651', '8651', 'Political organisations'),
  ('00000000-0000-0000-0001-000000000007', NULL, '8661', '8661', 'Religious organisations'),
  ('00000000-0000-0000-0001-000000000007', NULL, '8999', '8999', 'Professional services'),
  ('00000000-0000-0000-0001-000000000007', NULL, '9211', '9211', 'Court costs'),
  ('00000000-0000-0000-0001-000000000007', NULL, '9222', '9222', 'Fines'),
  ('00000000-0000-0000-0001-000000000007', NULL, '9223', '9223', 'Bail & bond'),
  ('00000000-0000-0000-0001-000000000007', NULL, '9311', '9311', 'Tax payments'),
  ('00000000-0000-0000-0001-000000000007', NULL, '9399', '9399', 'Government services'),
  ('00000000-0000-0000-0001-000000000007', NULL, '9402', '9402', 'Postal services'),
  ('00000000-0000-0000-0001-000000000007', NULL, '9405', '9405', 'Government services');
