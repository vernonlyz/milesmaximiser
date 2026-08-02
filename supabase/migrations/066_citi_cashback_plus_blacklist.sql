-- MCC eligibility (blacklist) for Citi Cash Back+ (card ...023, cashback).
-- Uses the SAME Citi exclusion list as Citi PremierMiles (...005) — excluded MCCs
-- earn no cashback; everything else earns the flat 1.6%. Mirrored from ...005 so
-- the two stay identical. (Runs after migration 058 which seeds ...005.)
-- Non-MCC exclusions (cash advance, balance transfer, IPP, fees, refunds) can't
-- be modelled by MCC.
UPDATE card_library SET mcc_mode = 'blacklist'
  WHERE bank = 'Citibank' AND name = 'Citi Cash Back+';

DELETE FROM card_mcc_eligibility WHERE card_id = '00000000-0000-0000-0001-000000000023';
INSERT INTO card_mcc_eligibility (card_id, category_label, mcc_start, mcc_end, note, payment_channel, reduced)
SELECT '00000000-0000-0000-0001-000000000023', category_label, mcc_start, mcc_end, note, payment_channel, reduced
FROM card_mcc_eligibility
WHERE card_id = '00000000-0000-0000-0001-000000000005';
