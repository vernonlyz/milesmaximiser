-- DBS Woman's World Card (card ...002): BLACKLIST model — 4 mpd online applies to
-- everything EXCEPT these MCCs (cash/quasi-cash, finance, insurance, government,
-- education, utilities, gambling, etc.). Listed exactly as singles (no ranges) so
-- unlisted codes are not wrongly excluded.

-- Missing MCC descriptions (idempotent).
INSERT INTO mcc_catalogue (code, description, default_category_id) VALUES
  ('4784', 'Toll and Bridge Fees',                                     '00000000-0000-0000-0000-000000000008'),
  ('4829', 'Money Transfer',                                          '00000000-0000-0000-0000-000000000010'),
  ('6010', 'Financial Institutions - Manual Cash Disbursements',       '00000000-0000-0000-0000-000000000010'),
  ('5047', 'Medical, Dental, Ophthalmic and Hospital Equipment',       '00000000-0000-0000-0000-000000000015'),
  ('5199', 'Non-Durable Goods - Not Elsewhere Classified',             '00000000-0000-0000-0000-000000000010'),
  ('5960', 'Direct Marketing - Insurance Services',                    '00000000-0000-0000-0000-000000000013'),
  ('5993', 'Cigar Stores and Stands',                                  '00000000-0000-0000-0000-000000000010'),
  ('6011', 'Financial Institutions - Automated Cash Disbursements',    '00000000-0000-0000-0000-000000000010'),
  ('6012', 'Financial Institutions - Merchandise and Services',        '00000000-0000-0000-0000-000000000010'),
  ('6050', 'Quasi Cash - Financial Institutions',                      '00000000-0000-0000-0000-000000000010'),
  ('6051', 'Non-Financial Institutions - Foreign / Crypto Currency',   '00000000-0000-0000-0000-000000000010'),
  ('6211', 'Security Brokers / Dealers',                               '00000000-0000-0000-0000-000000000010'),
  ('6399', 'Insurance - Not Elsewhere Classified',                     '00000000-0000-0000-0000-000000000013'),
  ('6529', 'Quasi Cash - Remote Stored Value Load - Financial',        '00000000-0000-0000-0000-000000000010'),
  ('6530', 'Quasi Cash - Remote Stored Value Load - Merchant',         '00000000-0000-0000-0000-000000000010'),
  ('6534', 'Quasi Cash - Money Transfer',                              '00000000-0000-0000-0000-000000000010'),
  ('6540', 'Stored Value Card Purchase / Load',                        '00000000-0000-0000-0000-000000000010'),
  ('7523', 'Parking Lots and Garages',                                 '00000000-0000-0000-0000-000000000008'),
  ('7349', 'Cleaning and Maintenance, Janitorial Services',            '00000000-0000-0000-0000-000000000010'),
  ('7511', 'Quasi Cash - Truck Stop Transactions',                     '00000000-0000-0000-0000-000000000010'),
  ('7995', 'Betting, Casinos and Lottery',                             '00000000-0000-0000-0000-000000000010'),
  ('8062', 'Hospitals',                                                '00000000-0000-0000-0000-000000000015'),
  ('8241', 'Correspondence Schools',                                   '00000000-0000-0000-0000-000000000010'),
  ('8244', 'Business and Secretarial Schools',                         '00000000-0000-0000-0000-000000000010'),
  ('8249', 'Vocational and Trade Schools',                             '00000000-0000-0000-0000-000000000010'),
  ('8651', 'Political Organisations',                                  '00000000-0000-0000-0000-000000000010'),
  ('8661', 'Religious Organisations',                                  '00000000-0000-0000-0000-000000000010'),
  ('8699', 'Membership Organizations - Not Elsewhere Classified',      '00000000-0000-0000-0000-000000000010'),
  ('8999', 'Professional Services - Not Elsewhere Classified',         '00000000-0000-0000-0000-000000000010'),
  ('9211', 'Court Costs, Alimony and Child Support',                   '00000000-0000-0000-0000-000000000010'),
  ('9223', 'Bail and Bond Payments',                                   '00000000-0000-0000-0000-000000000010'),
  ('9405', 'Intra-Government Purchases',                               '00000000-0000-0000-0000-000000000010')
ON CONFLICT (code) DO NOTHING;

UPDATE card_library SET mcc_mode = 'blacklist'
  WHERE bank = 'DBS' AND name = 'Woman''s World Card';

-- Seed (idempotent for this card)
DELETE FROM card_mcc_eligibility WHERE card_id = '00000000-0000-0000-0001-000000000002';
INSERT INTO card_mcc_eligibility (card_id, category_label, mcc_start, mcc_end, note)
SELECT '00000000-0000-0000-0001-000000000002', NULL, code, code, NULL
FROM (VALUES
  ('4784'),('4829'),('4900'),('5047'),('5199'),('5960'),('5993'),
  ('6010'),('6011'),('6012'),('6050'),('6051'),('6211'),('6300'),('6381'),('6399'),('6513'),
  ('6529'),('6530'),('6534'),('6540'),
  ('7349'),('7511'),('7523'),('7995'),
  ('8062'),('8211'),('8220'),('8241'),('8244'),('8249'),('8299'),('8398'),('8651'),('8661'),('8699'),('8999'),
  ('9211'),('9222'),('9223'),('9311'),('9399'),('9402'),('9405')
) AS t(code);
