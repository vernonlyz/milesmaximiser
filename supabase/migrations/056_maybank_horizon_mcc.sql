-- MCC eligibility (whitelist) for Maybank Horizon Visa Signature (card ...008).
-- Bonus earns on the MCCs below (2.8 mpd air tickets; 1.2 mpd local categories);
-- everything else earns base, so the published MCC exclusions (money transfer,
-- utilities, cash/quasi-cash, cleaning, parking, charities, political/religious)
-- are already covered implicitly and are NOT stored (whitelist = listed earn).
-- FCY bonus is currency-based (not MCC). Merchant-NAME exclusions (BAGUS, INSTAREM,
-- RAZERPAY, SIMPLYGO, SINGTEL DASH, etc.) can't be modelled by MCC and are omitted.
-- MCC 8699 earns only with the linked Diamond Sky Fuel Card (noted on the row).

-- Descriptions used below (idempotent).
INSERT INTO mcc_catalogue (code, description, default_category_id) VALUES
  ('4011', 'Railroads / Freight',                      '00000000-0000-0000-0000-000000000008'),
  ('4214', 'Motor Freight Carriers and Trucking',      '00000000-0000-0000-0000-000000000008'),
  ('4215', 'Courier Services',                          '00000000-0000-0000-0000-000000000008'),
  ('5172', 'Petroleum and Petroleum Products',         '00000000-0000-0000-0000-000000000003'),
  ('5552', 'Electric Vehicle Charging',                '00000000-0000-0000-0000-000000000003')
ON CONFLICT (code) DO NOTHING;

UPDATE card_library SET mcc_mode = 'whitelist'
  WHERE bank = 'Maybank' AND name = 'Horizon Visa Signature';

DELETE FROM card_mcc_eligibility WHERE card_id = '00000000-0000-0000-0001-000000000008';
INSERT INTO card_mcc_eligibility (card_id, category_label, mcc_start, mcc_end, note) VALUES
  -- Supermarkets & Dining
  ('00000000-0000-0000-0001-000000000008', 'Supermarkets & Dining', '5411', '5411', NULL),
  ('00000000-0000-0000-0001-000000000008', 'Supermarkets & Dining', '5441', '5441', NULL),
  ('00000000-0000-0000-0001-000000000008', 'Supermarkets & Dining', '5462', '5462', NULL),
  ('00000000-0000-0000-0001-000000000008', 'Supermarkets & Dining', '5499', '5499', NULL),
  ('00000000-0000-0000-0001-000000000008', 'Supermarkets & Dining', '5811', '5814', NULL),
  -- Transport & Petrol
  ('00000000-0000-0000-0001-000000000008', 'Transport & Petrol', '4011', '4011', NULL),
  ('00000000-0000-0000-0001-000000000008', 'Transport & Petrol', '4111', '4112', NULL),
  ('00000000-0000-0000-0001-000000000008', 'Transport & Petrol', '4121', '4121', NULL),
  ('00000000-0000-0000-0001-000000000008', 'Transport & Petrol', '4131', '4131', NULL),
  ('00000000-0000-0000-0001-000000000008', 'Transport & Petrol', '4214', '4215', NULL),
  ('00000000-0000-0000-0001-000000000008', 'Transport & Petrol', '4789', '4789', NULL),
  ('00000000-0000-0000-0001-000000000008', 'Transport & Petrol', '5172', '5172', NULL),
  ('00000000-0000-0000-0001-000000000008', 'Transport & Petrol', '5541', '5542', NULL),
  ('00000000-0000-0000-0001-000000000008', 'Transport & Petrol', '5552', '5552', NULL),
  ('00000000-0000-0000-0001-000000000008', 'Transport & Petrol', '8699', '8699', 'Diamond Sky Fuel Card only'),
  -- Department & Retail
  ('00000000-0000-0000-0001-000000000008', 'Department & Retail', '4816', '4816', NULL),
  ('00000000-0000-0000-0001-000000000008', 'Department & Retail', '5045', '5045', NULL),
  ('00000000-0000-0000-0001-000000000008', 'Department & Retail', '5262', '5262', NULL),
  ('00000000-0000-0000-0001-000000000008', 'Department & Retail', '5309', '5311', NULL),
  ('00000000-0000-0000-0001-000000000008', 'Department & Retail', '5331', '5331', NULL),
  ('00000000-0000-0000-0001-000000000008', 'Department & Retail', '5399', '5399', NULL),
  ('00000000-0000-0000-0001-000000000008', 'Department & Retail', '5611', '5611', NULL),
  ('00000000-0000-0000-0001-000000000008', 'Department & Retail', '5621', '5621', NULL),
  ('00000000-0000-0000-0001-000000000008', 'Department & Retail', '5631', '5631', NULL),
  ('00000000-0000-0000-0001-000000000008', 'Department & Retail', '5641', '5641', NULL),
  ('00000000-0000-0000-0001-000000000008', 'Department & Retail', '5651', '5651', NULL),
  ('00000000-0000-0000-0001-000000000008', 'Department & Retail', '5655', '5655', NULL),
  ('00000000-0000-0000-0001-000000000008', 'Department & Retail', '5661', '5661', NULL),
  ('00000000-0000-0000-0001-000000000008', 'Department & Retail', '5691', '5691', NULL),
  ('00000000-0000-0000-0001-000000000008', 'Department & Retail', '5699', '5699', NULL),
  ('00000000-0000-0000-0001-000000000008', 'Department & Retail', '5732', '5735', NULL),
  ('00000000-0000-0000-0001-000000000008', 'Department & Retail', '5912', '5912', NULL),
  ('00000000-0000-0000-0001-000000000008', 'Department & Retail', '5942', '5942', NULL),
  ('00000000-0000-0000-0001-000000000008', 'Department & Retail', '5944', '5949', NULL),
  ('00000000-0000-0000-0001-000000000008', 'Department & Retail', '5964', '5970', NULL),
  ('00000000-0000-0000-0001-000000000008', 'Department & Retail', '5977', '5977', NULL),
  ('00000000-0000-0000-0001-000000000008', 'Department & Retail', '5992', '5992', NULL),
  ('00000000-0000-0000-0001-000000000008', 'Department & Retail', '5999', '5999', NULL),
  -- Air Tickets
  ('00000000-0000-0000-0001-000000000008', 'Air Tickets', '3000', '3350', 'Airlines'),
  ('00000000-0000-0000-0001-000000000008', 'Air Tickets', '4511', '4511', NULL),
  -- Hotels
  ('00000000-0000-0000-0001-000000000008', 'Hotels', '3501', '3999', 'Hotels'),
  ('00000000-0000-0000-0001-000000000008', 'Hotels', '7011', '7011', NULL),
  -- Cruises / Travel / Car Rental
  ('00000000-0000-0000-0001-000000000008', 'Cruises / Travel / Car Rental', '3351', '3500', 'Car rental'),
  ('00000000-0000-0000-0001-000000000008', 'Cruises / Travel / Car Rental', '4411', '4411', 'Cruise lines'),
  ('00000000-0000-0000-0001-000000000008', 'Cruises / Travel / Car Rental', '4722', '4722', 'Travel agencies');
