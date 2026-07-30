-- Citi Rewards (card ...017): BLACKLIST model — everything earns the bonus EXCEPT
-- the MCCs listed here (mostly travel, quasi-cash, government, insurance, etc.).

-- Missing MCC descriptions (idempotent).
INSERT INTO mcc_catalogue (code, description, default_category_id) VALUES
  ('4112', 'Passenger Railways',                                   '00000000-0000-0000-0000-000000000008'),
  ('5962', 'Direct Marketing - Travel-Related Arrangement Services','00000000-0000-0000-0000-000000000006'),
  ('8398', 'Charitable and Social Service Organizations',          '00000000-0000-0000-0000-000000000010'),
  ('6513', 'Real Estate Agents and Managers - Rentals',            '00000000-0000-0000-0000-000000000010')
ON CONFLICT (code) DO NOTHING;

UPDATE card_library SET mcc_mode = 'blacklist'
  WHERE bank = 'Citibank' AND name = 'Rewards Mastercard';

-- Seed (idempotent for this card)
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
