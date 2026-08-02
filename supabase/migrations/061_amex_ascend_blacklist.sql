-- MCC eligibility (blacklist) for Amex KrisFlyer Ascend (card ...019).
-- NOTE: American Express does not publish a comprehensive MCC exclusion table for
-- this card — its exclusions are mostly a merchant / transaction-type list. Only
-- the exclusions that map unambiguously to an MCC are stored here:
--   • Utilities (4900)
--   • Insurance (6300/6381/6399) — the "authorised Amex channel earns" exception
--     can't be modelled, so insurance shows as excluded generally.
--   • Stored-value loads (6529/6530/6540) — EZ-Link / GrabPay top-ups.
-- NOT modelled (merchant/transaction-type, not MCC): SPC service stations (only
-- SPC, not all petrol — so 5541/5542 are intentionally NOT excluded), SingPost SAM,
-- purchase of KrisFlyer miles, cash advance / Express Cash, balance transfer,
-- instalments, annual fees, interest, late fees, traveller's cheques.
UPDATE card_library SET mcc_mode = 'blacklist'
  WHERE bank = 'American Express' AND name = 'KrisFlyer Ascend';

DELETE FROM card_mcc_eligibility WHERE card_id = '00000000-0000-0000-0001-000000000019';
INSERT INTO card_mcc_eligibility (card_id, category_label, mcc_start, mcc_end, note) VALUES
  ('00000000-0000-0000-0001-000000000019', NULL, '4900', '4900', 'Utilities'),
  ('00000000-0000-0000-0001-000000000019', NULL, '6300', '6300', 'Insurance (except via Amex channels)'),
  ('00000000-0000-0000-0001-000000000019', NULL, '6381', '6381', 'Insurance premiums'),
  ('00000000-0000-0000-0001-000000000019', NULL, '6399', '6399', 'Insurance services'),
  ('00000000-0000-0000-0001-000000000019', NULL, '6529', '6530', 'Stored value load (EZ-Link / GrabPay top-ups)'),
  ('00000000-0000-0000-0001-000000000019', NULL, '6540', '6540', 'Stored value load');
