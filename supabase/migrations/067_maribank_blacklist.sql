-- MCC eligibility (blacklist) for MariBank Mari Credit Card (card ...024, cashback).
-- MariBank does not publish an exact MCC table — it lists excluded CATEGORIES with
-- "typical" MCCs. These are the standard MCCs for those categories (indicative):
-- money transfer, financial institutions, quasi-cash/crypto, stored-value top-ups,
-- insurance, gambling, charity, government (incl. tax). Excluded MCCs earn no
-- cashback; everything else earns the flat 1.5%. Cash advances / balance transfers
-- / fees are transaction-type (not MCC) and can't be modelled.
UPDATE card_library SET mcc_mode = 'blacklist'
  WHERE bank = 'MariBank' AND name = 'Mari Credit Card';

DELETE FROM card_mcc_eligibility WHERE card_id = '00000000-0000-0000-0001-000000000024';
INSERT INTO card_mcc_eligibility (card_id, category_label, mcc_start, mcc_end, note) VALUES
  ('00000000-0000-0000-0001-000000000024', NULL, '4829', '4829', 'Money transfer'),
  ('00000000-0000-0000-0001-000000000024', NULL, '6010', '6012', 'Cash disbursement / financial'),
  ('00000000-0000-0000-0001-000000000024', NULL, '6050', '6051', 'Quasi cash / crypto'),
  ('00000000-0000-0000-0001-000000000024', NULL, '6300', '6300', 'Insurance'),
  ('00000000-0000-0000-0001-000000000024', NULL, '6381', '6381', 'Insurance premiums'),
  ('00000000-0000-0000-0001-000000000024', NULL, '6399', '6399', 'Insurance services'),
  ('00000000-0000-0000-0001-000000000024', NULL, '6529', '6530', 'Stored value load'),
  ('00000000-0000-0000-0001-000000000024', NULL, '6534', '6534', 'Money transfer'),
  ('00000000-0000-0000-0001-000000000024', NULL, '6540', '6540', 'Stored value load'),
  ('00000000-0000-0000-0001-000000000024', NULL, '7800', '7800', 'Government lotteries'),
  ('00000000-0000-0000-0001-000000000024', NULL, '7995', '7995', 'Gambling'),
  ('00000000-0000-0000-0001-000000000024', NULL, '8398', '8398', 'Charities'),
  ('00000000-0000-0000-0001-000000000024', NULL, '9211', '9405', 'Government services (incl. tax)');
