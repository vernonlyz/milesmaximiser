-- MCC eligibility (blacklist) for the UOB PRVI Miles trio — Visa (...003),
-- Amex (...009) and Mastercard (...018). Everything earns UNI$/miles EXCEPT the
-- MCCs below (money transfer, utilities, finance/quasi-cash, insurance, rent,
-- stored value, education, government, charities, gambling, etc.). Same list for
-- all three cards. Non-MCC exclusions (NETS, IPP/SmartPay, loans, fees, refunds)
-- can't be modelled by MCC.

UPDATE card_library SET mcc_mode = 'blacklist' WHERE id IN (
  '00000000-0000-0000-0001-000000000003',  -- PRVI Miles Visa
  '00000000-0000-0000-0001-000000000009',  -- PRVI Miles Amex
  '00000000-0000-0000-0001-000000000018'   -- PRVI Miles Mastercard
);

DELETE FROM card_mcc_eligibility WHERE card_id IN (
  '00000000-0000-0000-0001-000000000003',
  '00000000-0000-0000-0001-000000000009',
  '00000000-0000-0000-0001-000000000018'
);

INSERT INTO card_mcc_eligibility (card_id, category_label, mcc_start, mcc_end, note)
SELECT c.card_id, NULL, m.mcc_start, m.mcc_end, m.note
FROM (VALUES
  ('00000000-0000-0000-0001-000000000003'),
  ('00000000-0000-0000-0001-000000000009'),
  ('00000000-0000-0000-0001-000000000018')
) AS c(card_id)
CROSS JOIN (VALUES
  ('4829','4829','Money transfer'),
  ('4900','4900','Utilities'),
  ('5199','5199','Nondurable goods'),
  ('5960','5960','Insurance (direct marketing)'),
  ('5965','5965','Direct marketing'),
  ('5993','5993','Cigar stores'),
  ('6012','6012','Financial institutions'),
  ('6050','6050','Quasi cash'),
  ('6051','6051','Crypto / foreign currency'),
  ('6211','6211','Securities / brokerage'),
  ('6300','6300','Insurance'),
  ('6513','6513','Rent'),
  ('6529','6530','Stored value load'),
  ('6534','6534','Money transfer'),
  ('6540','6540','Stored value load'),
  ('7349','7349','Property management'),
  ('7511','7511','Truck stops'),
  ('7523','7523','Parking'),
  ('7995','7995','Gambling / betting'),
  ('8062','8062','Hospitals'),
  ('8211','8211','Schools'),
  ('8220','8220','Universities'),
  ('8241','8241','Correspondence schools'),
  ('8244','8244','Business schools'),
  ('8249','8249','Trade / vocational schools'),
  ('8299','8299','Educational services'),
  ('8398','8398','Charities'),
  ('8651','8651','Political organisations'),
  ('8661','8661','Religious organisations'),
  ('8699','8699','Membership organisations'),
  ('8999','8999','Professional services'),
  ('9211','9311','Government services'),
  ('9399','9399','Government services'),
  ('9402','9402','Postal services'),
  ('9405','9405','Government services')
) AS m(mcc_start, mcc_end, note);
