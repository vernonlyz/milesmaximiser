-- MCC eligibility (blacklist) for Standard Chartered Simply Cash (card ...021).
-- Cashback card: every MCC earns the flat 1.5% cashback EXCEPT those below, which
-- earn nothing. Uses SC's published MCC exclusion list plus the two MCCs section 5
-- names explicitly (6012 financial institutions, 6540 stored-value load).
-- Insurance premiums and gambling are excluded by policy but are not in SC's MCC
-- table, so their MCCs are not inferred here. Non-MCC exclusions (cash advance,
-- balance transfer, IPP, fees, AXS/SAM, refunds) can't be modelled by MCC.
UPDATE card_library SET mcc_mode = 'blacklist'
  WHERE bank = 'Standard Chartered' AND name = 'Simply Cash';

DELETE FROM card_mcc_eligibility WHERE card_id = '00000000-0000-0000-0001-000000000021';
INSERT INTO card_mcc_eligibility (card_id, category_label, mcc_start, mcc_end, note) VALUES
  ('00000000-0000-0000-0001-000000000021', NULL, '4900', '4900', 'Utilities'),
  ('00000000-0000-0000-0001-000000000021', NULL, '5047', '5047', 'Medical / hospital equipment'),
  ('00000000-0000-0000-0001-000000000021', NULL, '5199', '5199', 'Nondurable goods'),
  ('00000000-0000-0000-0001-000000000021', NULL, '6012', '6012', 'Financial institutions'),
  ('00000000-0000-0000-0001-000000000021', NULL, '6050', '6051', 'Quasi cash / crypto'),
  ('00000000-0000-0000-0001-000000000021', NULL, '6529', '6530', 'Stored value load'),
  ('00000000-0000-0000-0001-000000000021', NULL, '6534', '6534', 'Money transfer'),
  ('00000000-0000-0000-0001-000000000021', NULL, '6540', '6540', 'Stored value load'),
  ('00000000-0000-0000-0001-000000000021', NULL, '7299', '7299', 'Other services'),
  ('00000000-0000-0000-0001-000000000021', NULL, '7511', '7511', 'Truck stops'),
  ('00000000-0000-0000-0001-000000000021', NULL, '8062', '8062', 'Hospitals'),
  ('00000000-0000-0000-0001-000000000021', NULL, '8999', '8999', 'Professional services');
