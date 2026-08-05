-- HSBC Revolution (card ...015): the MCC set already matches the published list
-- exactly; this only adds the category groupings (Travel / Department & Retail /
-- Dining / Others) so My Cards → Details shows grouped headers like the other
-- whitelist cards, instead of one flat ungrouped list. Codes unchanged.
DELETE FROM card_mcc_eligibility WHERE card_id = '00000000-0000-0000-0001-000000000015';
INSERT INTO card_mcc_eligibility (card_id, category_label, mcc_start, mcc_end, note) VALUES
  -- Travel (Airlines, Car Rental, Lodging, Cruise Lines)
  ('00000000-0000-0000-0001-000000000015', 'Travel', '3000', '3350', 'Airlines'),
  ('00000000-0000-0000-0001-000000000015', 'Travel', '4511', '4511', 'Airlines'),
  ('00000000-0000-0000-0001-000000000015', 'Travel', '3351', '3500', 'Car rental'),
  ('00000000-0000-0000-0001-000000000015', 'Travel', '3501', '3999', 'Lodging'),
  ('00000000-0000-0000-0001-000000000015', 'Travel', '7011', '7011', 'Lodging'),
  ('00000000-0000-0000-0001-000000000015', 'Travel', '4411', '4411', 'Cruise lines'),
  -- Department & Retail
  ('00000000-0000-0000-0001-000000000015', 'Department & Retail', '4816', '4816', NULL),
  ('00000000-0000-0000-0001-000000000015', 'Department & Retail', '5045', '5045', NULL),
  ('00000000-0000-0000-0001-000000000015', 'Department & Retail', '5262', '5262', NULL),
  ('00000000-0000-0000-0001-000000000015', 'Department & Retail', '5309', '5311', NULL),
  ('00000000-0000-0000-0001-000000000015', 'Department & Retail', '5331', '5331', NULL),
  ('00000000-0000-0000-0001-000000000015', 'Department & Retail', '5399', '5399', NULL),
  ('00000000-0000-0000-0001-000000000015', 'Department & Retail', '5611', '5611', NULL),
  ('00000000-0000-0000-0001-000000000015', 'Department & Retail', '5621', '5621', NULL),
  ('00000000-0000-0000-0001-000000000015', 'Department & Retail', '5631', '5631', NULL),
  ('00000000-0000-0000-0001-000000000015', 'Department & Retail', '5641', '5641', NULL),
  ('00000000-0000-0000-0001-000000000015', 'Department & Retail', '5651', '5651', NULL),
  ('00000000-0000-0000-0001-000000000015', 'Department & Retail', '5655', '5655', NULL),
  ('00000000-0000-0000-0001-000000000015', 'Department & Retail', '5661', '5661', NULL),
  ('00000000-0000-0000-0001-000000000015', 'Department & Retail', '5691', '5691', NULL),
  ('00000000-0000-0000-0001-000000000015', 'Department & Retail', '5699', '5699', NULL),
  ('00000000-0000-0000-0001-000000000015', 'Department & Retail', '5732', '5735', NULL),
  ('00000000-0000-0000-0001-000000000015', 'Department & Retail', '5912', '5912', NULL),
  ('00000000-0000-0000-0001-000000000015', 'Department & Retail', '5942', '5942', NULL),
  ('00000000-0000-0000-0001-000000000015', 'Department & Retail', '5944', '5949', NULL),
  ('00000000-0000-0000-0001-000000000015', 'Department & Retail', '5964', '5970', 'Direct marketing / craft'),
  ('00000000-0000-0000-0001-000000000015', 'Department & Retail', '5992', '5992', NULL),
  ('00000000-0000-0000-0001-000000000015', 'Department & Retail', '5999', '5999', NULL),
  -- Dining (excl. hotel dining)
  ('00000000-0000-0000-0001-000000000015', 'Dining', '5441', '5441', NULL),
  ('00000000-0000-0000-0001-000000000015', 'Dining', '5462', '5462', NULL),
  ('00000000-0000-0000-0001-000000000015', 'Dining', '5811', '5813', NULL),
  -- Others (Transport, Membership Clubs)
  ('00000000-0000-0000-0001-000000000015', 'Others', '4121', '4121', 'Taxis / limousines'),
  ('00000000-0000-0000-0001-000000000015', 'Others', '7997', '7997', 'Membership clubs');
