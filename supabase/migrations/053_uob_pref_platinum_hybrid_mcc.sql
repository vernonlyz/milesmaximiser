-- Channel-aware MCC eligibility for UOB Preferred Platinum Visa (card ...013).
-- Introduces payment_channel on card_mcc_eligibility and the 'hybrid' mcc_mode:
--   • contactless earns on ALL MCCs (except the exclusions below)
--   • online earns only on the listed 'online' MCCs (except the exclusions)
--   • null-channel rows are exclusions on BOTH channels
--   • chip/swipe earns base (handled in the app)
ALTER TABLE card_mcc_eligibility
  ADD COLUMN IF NOT EXISTS payment_channel TEXT;   -- 'online' | 'contactless' | NULL (all channels)

-- Descriptions used below (idempotent).
INSERT INTO mcc_catalogue (code, description, default_category_id) VALUES
  ('7841', 'Video Tape / DVD Rental Stores',   '00000000-0000-0000-0000-000000000007'),
  ('7998', 'Aquariums, Dolphinariums, Zoos',   '00000000-0000-0000-0000-000000000007')
ON CONFLICT (code) DO NOTHING;

UPDATE card_library SET mcc_mode = 'hybrid'
  WHERE bank = 'UOB' AND name = 'Preferred Platinum Visa';

DELETE FROM card_mcc_eligibility WHERE card_id = '00000000-0000-0000-0001-000000000013';

-- Online bonus whitelist (payment_channel = 'online')
INSERT INTO card_mcc_eligibility (card_id, category_label, mcc_start, mcc_end, note, payment_channel) VALUES
  -- Department Stores & Retail
  ('00000000-0000-0000-0001-000000000013', 'Department Stores & Retail', '4816', '4816', NULL, 'online'),
  ('00000000-0000-0000-0001-000000000013', 'Department Stores & Retail', '5262', '5262', NULL, 'online'),
  ('00000000-0000-0000-0001-000000000013', 'Department Stores & Retail', '5306', '5306', NULL, 'online'),
  ('00000000-0000-0000-0001-000000000013', 'Department Stores & Retail', '5309', '5311', NULL, 'online'),
  ('00000000-0000-0000-0001-000000000013', 'Department Stores & Retail', '5331', '5331', NULL, 'online'),
  ('00000000-0000-0000-0001-000000000013', 'Department Stores & Retail', '5399', '5399', NULL, 'online'),
  ('00000000-0000-0000-0001-000000000013', 'Department Stores & Retail', '5611', '5611', NULL, 'online'),
  ('00000000-0000-0000-0001-000000000013', 'Department Stores & Retail', '5621', '5621', NULL, 'online'),
  ('00000000-0000-0000-0001-000000000013', 'Department Stores & Retail', '5631', '5631', NULL, 'online'),
  ('00000000-0000-0000-0001-000000000013', 'Department Stores & Retail', '5641', '5641', NULL, 'online'),
  ('00000000-0000-0000-0001-000000000013', 'Department Stores & Retail', '5651', '5651', NULL, 'online'),
  ('00000000-0000-0000-0001-000000000013', 'Department Stores & Retail', '5661', '5661', NULL, 'online'),
  ('00000000-0000-0000-0001-000000000013', 'Department Stores & Retail', '5691', '5691', NULL, 'online'),
  ('00000000-0000-0000-0001-000000000013', 'Department Stores & Retail', '5699', '5699', NULL, 'online'),
  ('00000000-0000-0000-0001-000000000013', 'Department Stores & Retail', '5732', '5735', NULL, 'online'),
  ('00000000-0000-0000-0001-000000000013', 'Department Stores & Retail', '5912', '5912', NULL, 'online'),
  ('00000000-0000-0000-0001-000000000013', 'Department Stores & Retail', '5942', '5942', NULL, 'online'),
  ('00000000-0000-0000-0001-000000000013', 'Department Stores & Retail', '5944', '5949', NULL, 'online'),
  ('00000000-0000-0000-0001-000000000013', 'Department Stores & Retail', '5964', '5964', NULL, 'online'),
  ('00000000-0000-0000-0001-000000000013', 'Department Stores & Retail', '5966', '5970', NULL, 'online'),
  ('00000000-0000-0000-0001-000000000013', 'Department Stores & Retail', '5992', '5992', NULL, 'online'),
  ('00000000-0000-0000-0001-000000000013', 'Department Stores & Retail', '5999', '5999', NULL, 'online'),
  -- Supermarkets / Dining / Food Delivery
  ('00000000-0000-0000-0001-000000000013', 'Supermarkets / Dining / Food Delivery', '5333', '5333', NULL, 'online'),
  ('00000000-0000-0000-0001-000000000013', 'Supermarkets / Dining / Food Delivery', '5411', '5411', NULL, 'online'),
  ('00000000-0000-0000-0001-000000000013', 'Supermarkets / Dining / Food Delivery', '5441', '5441', NULL, 'online'),
  ('00000000-0000-0000-0001-000000000013', 'Supermarkets / Dining / Food Delivery', '5462', '5462', NULL, 'online'),
  ('00000000-0000-0000-0001-000000000013', 'Supermarkets / Dining / Food Delivery', '5499', '5499', NULL, 'online'),
  ('00000000-0000-0000-0001-000000000013', 'Supermarkets / Dining / Food Delivery', '5811', '5812', NULL, 'online'),
  ('00000000-0000-0000-0001-000000000013', 'Supermarkets / Dining / Food Delivery', '5814', '5814', NULL, 'online'),
  ('00000000-0000-0000-0001-000000000013', 'Supermarkets / Dining / Food Delivery', '8012', '8012', NULL, 'online'),
  ('00000000-0000-0000-0001-000000000013', 'Supermarkets / Dining / Food Delivery', '9751', '9751', NULL, 'online'),
  -- Entertainment & Ticketing
  ('00000000-0000-0000-0001-000000000013', 'Entertainment & Ticketing', '7278', '7278', NULL, 'online'),
  ('00000000-0000-0000-0001-000000000013', 'Entertainment & Ticketing', '7832', '7832', NULL, 'online'),
  ('00000000-0000-0000-0001-000000000013', 'Entertainment & Ticketing', '7841', '7841', NULL, 'online'),
  ('00000000-0000-0000-0001-000000000013', 'Entertainment & Ticketing', '7922', '7922', NULL, 'online'),
  ('00000000-0000-0000-0001-000000000013', 'Entertainment & Ticketing', '7991', '7991', NULL, 'online'),
  ('00000000-0000-0000-0001-000000000013', 'Entertainment & Ticketing', '7996', '7996', NULL, 'online'),
  ('00000000-0000-0000-0001-000000000013', 'Entertainment & Ticketing', '7998', '7999', NULL, 'online');

-- Exclusions on BOTH channels (payment_channel = NULL)
INSERT INTO card_mcc_eligibility (card_id, category_label, mcc_start, mcc_end, note, payment_channel) VALUES
  ('00000000-0000-0000-0001-000000000013', NULL, '4829', '4829', 'Money transfer', NULL),
  ('00000000-0000-0000-0001-000000000013', NULL, '4900', '4900', 'Utilities', NULL),
  ('00000000-0000-0000-0001-000000000013', NULL, '5199', '5199', 'Nondurable goods', NULL),
  ('00000000-0000-0000-0001-000000000013', NULL, '5960', '5960', 'Insurance', NULL),
  ('00000000-0000-0000-0001-000000000013', NULL, '5965', '5965', 'Direct marketing', NULL),
  ('00000000-0000-0000-0001-000000000013', NULL, '5993', '5993', 'Cigar stores', NULL),
  ('00000000-0000-0000-0001-000000000013', NULL, '6012', '6012', 'Financial institutions', NULL),
  ('00000000-0000-0000-0001-000000000013', NULL, '6050', '6050', 'Quasi cash', NULL),
  ('00000000-0000-0000-0001-000000000013', NULL, '6051', '6051', 'Crypto / foreign currency', NULL),
  ('00000000-0000-0000-0001-000000000013', NULL, '6211', '6211', 'Securities / brokerage', NULL),
  ('00000000-0000-0000-0001-000000000013', NULL, '6300', '6300', 'Insurance', NULL),
  ('00000000-0000-0000-0001-000000000013', NULL, '6513', '6513', 'Rent', NULL),
  ('00000000-0000-0000-0001-000000000013', NULL, '6529', '6530', 'Stored value load', NULL),
  ('00000000-0000-0000-0001-000000000013', NULL, '6534', '6534', 'Money transfer', NULL),
  ('00000000-0000-0000-0001-000000000013', NULL, '6540', '6540', 'Stored value load', NULL),
  ('00000000-0000-0000-0001-000000000013', NULL, '7349', '7349', 'Property management', NULL),
  ('00000000-0000-0000-0001-000000000013', NULL, '7511', '7511', 'Truck stops', NULL),
  ('00000000-0000-0000-0001-000000000013', NULL, '7523', '7523', 'Parking', NULL),
  ('00000000-0000-0000-0001-000000000013', NULL, '8062', '8062', 'Hospitals', NULL),
  ('00000000-0000-0000-0001-000000000013', NULL, '8211', '8211', 'Schools', NULL),
  ('00000000-0000-0000-0001-000000000013', NULL, '8220', '8220', 'Universities', NULL),
  ('00000000-0000-0000-0001-000000000013', NULL, '8398', '8398', 'Charities', NULL),
  ('00000000-0000-0000-0001-000000000013', NULL, '8651', '8651', 'Political organisations', NULL),
  ('00000000-0000-0000-0001-000000000013', NULL, '8661', '8661', 'Religious organisations', NULL),
  ('00000000-0000-0000-0001-000000000013', NULL, '8699', '8699', 'Membership organisations', NULL),
  ('00000000-0000-0000-0001-000000000013', NULL, '8999', '8999', 'Professional services', NULL),
  ('00000000-0000-0000-0001-000000000013', NULL, '9211', '9311', 'Government services', NULL),
  ('00000000-0000-0000-0001-000000000013', NULL, '9399', '9399', 'Government services', NULL),
  ('00000000-0000-0000-0001-000000000013', NULL, '9402', '9402', 'Postal services', NULL),
  ('00000000-0000-0000-0001-000000000013', NULL, '9405', '9405', 'Government services', NULL);
