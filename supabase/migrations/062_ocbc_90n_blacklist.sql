-- MCC eligibility (blacklist) for OCBC 90°N (card ...006).
-- Everything earns 90°N Miles EXCEPT the MCCs below (money transfer, utilities,
-- finance/quasi-cash, insurance, rent, stored value, gambling, education,
-- charities, government, etc.). Excluded payment providers (GrabPay, YouTrip,
-- ShopeePay, EZ-Link, NETS FlashPay, AXS/SAM, TransitLink) mostly code as stored
-- value (6540, covered); other non-MCC exclusions (cash advance, balance transfer,
-- IPP, fees, income tax facilities) can't be modelled by MCC.
UPDATE card_library SET mcc_mode = 'blacklist'
  WHERE bank = 'OCBC' AND name = '90°N Visa';

DELETE FROM card_mcc_eligibility WHERE card_id = '00000000-0000-0000-0001-000000000006';
INSERT INTO card_mcc_eligibility (card_id, category_label, mcc_start, mcc_end, note) VALUES
  ('00000000-0000-0000-0001-000000000006', NULL, '4829', '4829', 'Money transfer'),
  ('00000000-0000-0000-0001-000000000006', NULL, '4900', '4900', 'Utilities'),
  ('00000000-0000-0000-0001-000000000006', NULL, '5199', '5199', 'Nondurable goods'),
  ('00000000-0000-0000-0001-000000000006', NULL, '5960', '5960', 'Insurance (direct marketing)'),
  ('00000000-0000-0000-0001-000000000006', NULL, '6010', '6010', 'Manual cash disbursement'),
  ('00000000-0000-0000-0001-000000000006', NULL, '6012', '6012', 'Financial institutions'),
  ('00000000-0000-0000-0001-000000000006', NULL, '6051', '6051', 'Crypto / quasi cash'),
  ('00000000-0000-0000-0001-000000000006', NULL, '6211', '6211', 'Securities / brokerage'),
  ('00000000-0000-0000-0001-000000000006', NULL, '6300', '6300', 'Insurance premiums'),
  ('00000000-0000-0000-0001-000000000006', NULL, '6399', '6399', 'Insurance services'),
  ('00000000-0000-0000-0001-000000000006', NULL, '6513', '6513', 'Rent / real estate'),
  ('00000000-0000-0000-0001-000000000006', NULL, '6540', '6540', 'Stored value load (GrabPay/YouTrip/EZ-Link etc.)'),
  ('00000000-0000-0000-0001-000000000006', NULL, '7523', '7523', 'Parking'),
  ('00000000-0000-0000-0001-000000000006', NULL, '7995', '7995', 'Gambling'),
  ('00000000-0000-0000-0001-000000000006', NULL, '8211', '8211', 'Schools'),
  ('00000000-0000-0000-0001-000000000006', NULL, '8220', '8220', 'Universities'),
  ('00000000-0000-0000-0001-000000000006', NULL, '8241', '8241', 'Correspondence schools'),
  ('00000000-0000-0000-0001-000000000006', NULL, '8244', '8244', 'Business schools'),
  ('00000000-0000-0000-0001-000000000006', NULL, '8249', '8249', 'Vocational schools'),
  ('00000000-0000-0000-0001-000000000006', NULL, '8299', '8299', 'Educational services'),
  ('00000000-0000-0000-0001-000000000006', NULL, '8398', '8398', 'Charities'),
  ('00000000-0000-0000-0001-000000000006', NULL, '8651', '8651', 'Political organisations'),
  ('00000000-0000-0000-0001-000000000006', NULL, '8661', '8661', 'Religious organisations'),
  ('00000000-0000-0000-0001-000000000006', NULL, '9211', '9211', 'Court costs'),
  ('00000000-0000-0000-0001-000000000006', NULL, '9222', '9222', 'Fines'),
  ('00000000-0000-0000-0001-000000000006', NULL, '9223', '9223', 'Bail & bond'),
  ('00000000-0000-0000-0001-000000000006', NULL, '9311', '9311', 'Tax payments'),
  ('00000000-0000-0000-0001-000000000006', NULL, '9399', '9399', 'Government services'),
  ('00000000-0000-0000-0001-000000000006', NULL, '9402', '9402', 'Postal services'),
  ('00000000-0000-0000-0001-000000000006', NULL, '9405', '9405', 'Government services');
