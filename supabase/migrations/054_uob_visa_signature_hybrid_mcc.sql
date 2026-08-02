-- Channel-aware MCC eligibility for UOB Visa Signature (card ...012).
-- Same 'hybrid' mcc_mode as UOB Preferred Platinum, but WITHOUT an online
-- whitelist — Visa Signature's 4 mpd bonus is tap-to-pay (contactless) only:
--   • contactless earns on ALL MCCs except the exclusions below (incl. petrol)
--   • online and chip/swipe earn base (no online bonus rows → online = base)
-- Exclusions are the same list as UOB Preferred Platinum. Petrol (5541/5542) is
-- intentionally NOT excluded, so it earns the bonus on contactless.
UPDATE card_library SET mcc_mode = 'hybrid'
  WHERE bank = 'UOB' AND name = 'Visa Signature';

DELETE FROM card_mcc_eligibility WHERE card_id = '00000000-0000-0000-0001-000000000012';

-- Exclusions on BOTH channels (payment_channel = NULL). No online whitelist rows.
INSERT INTO card_mcc_eligibility (card_id, category_label, mcc_start, mcc_end, note, payment_channel) VALUES
  ('00000000-0000-0000-0001-000000000012', NULL, '4829', '4829', 'Money transfer', NULL),
  ('00000000-0000-0000-0001-000000000012', NULL, '4900', '4900', 'Utilities', NULL),
  ('00000000-0000-0000-0001-000000000012', NULL, '5199', '5199', 'Nondurable goods', NULL),
  ('00000000-0000-0000-0001-000000000012', NULL, '5960', '5960', 'Insurance', NULL),
  ('00000000-0000-0000-0001-000000000012', NULL, '5965', '5965', 'Direct marketing', NULL),
  ('00000000-0000-0000-0001-000000000012', NULL, '5993', '5993', 'Cigar stores', NULL),
  ('00000000-0000-0000-0001-000000000012', NULL, '6012', '6012', 'Financial institutions', NULL),
  ('00000000-0000-0000-0001-000000000012', NULL, '6050', '6050', 'Quasi cash', NULL),
  ('00000000-0000-0000-0001-000000000012', NULL, '6051', '6051', 'Crypto / foreign currency', NULL),
  ('00000000-0000-0000-0001-000000000012', NULL, '6211', '6211', 'Securities / brokerage', NULL),
  ('00000000-0000-0000-0001-000000000012', NULL, '6300', '6300', 'Insurance', NULL),
  ('00000000-0000-0000-0001-000000000012', NULL, '6513', '6513', 'Rent', NULL),
  ('00000000-0000-0000-0001-000000000012', NULL, '6529', '6530', 'Stored value load', NULL),
  ('00000000-0000-0000-0001-000000000012', NULL, '6534', '6534', 'Money transfer', NULL),
  ('00000000-0000-0000-0001-000000000012', NULL, '6540', '6540', 'Stored value load', NULL),
  ('00000000-0000-0000-0001-000000000012', NULL, '7349', '7349', 'Property management', NULL),
  ('00000000-0000-0000-0001-000000000012', NULL, '7511', '7511', 'Truck stops', NULL),
  ('00000000-0000-0000-0001-000000000012', NULL, '7523', '7523', 'Parking', NULL),
  ('00000000-0000-0000-0001-000000000012', NULL, '8062', '8062', 'Hospitals', NULL),
  ('00000000-0000-0000-0001-000000000012', NULL, '8211', '8211', 'Schools', NULL),
  ('00000000-0000-0000-0001-000000000012', NULL, '8220', '8220', 'Universities', NULL),
  ('00000000-0000-0000-0001-000000000012', NULL, '8398', '8398', 'Charities', NULL),
  ('00000000-0000-0000-0001-000000000012', NULL, '8651', '8651', 'Political organisations', NULL),
  ('00000000-0000-0000-0001-000000000012', NULL, '8661', '8661', 'Religious organisations', NULL),
  ('00000000-0000-0000-0001-000000000012', NULL, '8699', '8699', 'Membership organisations', NULL),
  ('00000000-0000-0000-0001-000000000012', NULL, '8999', '8999', 'Professional services', NULL),
  ('00000000-0000-0000-0001-000000000012', NULL, '9211', '9311', 'Government services', NULL),
  ('00000000-0000-0000-0001-000000000012', NULL, '9399', '9399', 'Government services', NULL),
  ('00000000-0000-0000-0001-000000000012', NULL, '9402', '9402', 'Postal services', NULL),
  ('00000000-0000-0000-0001-000000000012', NULL, '9405', '9405', 'Government services', NULL);
