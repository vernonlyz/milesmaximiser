-- Confidence that a vendor's default MCC is correct:
--   confirmed  — verified on a real statement/transaction
--   likely     — the expected MCC for this merchant, unverified (default; the
--                existing seed is hand-built educated guesses)
--   unverified — a placeholder/guess you're unsure about
ALTER TABLE vendor_catalogue
  ADD COLUMN IF NOT EXISTS mcc_confidence TEXT NOT NULL DEFAULT 'likely';

ALTER TABLE vendor_catalogue DROP CONSTRAINT IF EXISTS vendor_catalogue_mcc_confidence_chk;
ALTER TABLE vendor_catalogue
  ADD CONSTRAINT vendor_catalogue_mcc_confidence_chk
  CHECK (mcc_confidence IN ('unverified', 'likely', 'confirmed'));
