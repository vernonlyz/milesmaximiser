-- Reduced-rate MCC eligibility for UOB Absolute Cashback (card ...022).
-- Absolute has no 0% MCC blacklist — instead the "traditionally excluded"
-- categories still earn a reduced 0.3% cashback (vs the standard 1.7%). This is
-- modelled with the new `reduced` flag on card_mcc_eligibility: matched rows
-- resolve to the 'reduced' state (not 'ineligible'). Everything else earns full.
-- NOTE: UOB publishes categories, not exact MCCs, so these are the standard MCC
-- ranges per category (indicative). Grab wallet top-ups are merchant-specific and
-- not cleanly MCC-mappable, so they are omitted. The true 0% items (NETS, IPP,
-- cash advance, fees, refunds) are transaction-type, not MCC.
ALTER TABLE card_mcc_eligibility
  ADD COLUMN IF NOT EXISTS reduced BOOLEAN NOT NULL DEFAULT false;

UPDATE card_library SET mcc_mode = 'blacklist'
  WHERE bank = 'UOB' AND name = 'Absolute Cashback';

DELETE FROM card_mcc_eligibility WHERE card_id = '00000000-0000-0000-0001-000000000022';
INSERT INTO card_mcc_eligibility (card_id, category_label, mcc_start, mcc_end, note, reduced) VALUES
  ('00000000-0000-0000-0001-000000000022', 'Charity',                '8398', '8398', '0.3% cashback', true),
  ('00000000-0000-0000-0001-000000000022', 'Education',              '8211', '8299', '0.3% cashback', true),
  ('00000000-0000-0000-0001-000000000022', 'Healthcare',             '8011', '8099', '0.3% cashback', true),
  ('00000000-0000-0000-0001-000000000022', 'Utilities',              '4900', '4900', '0.3% cashback', true),
  ('00000000-0000-0000-0001-000000000022', 'Professional services',  '8999', '8999', '0.3% cashback', true),
  ('00000000-0000-0000-0001-000000000022', 'Government services',    '9211', '9405', '0.3% cashback', true);
