-- MilesMaximiser — minimum spend threshold on library_caps
--
-- Some cards require a minimum total card spend per period before the
-- bonus rate unlocks. This is modelled as min_spend on the cap row:
-- the engine checks total card spending (all categories) for the cap's
-- period against min_spend before applying any bonus rate.
--
-- Cards affected:
--   UOB Visa Signature     — S$1,000/month total spend to unlock 4 mpd
--   Maybank XL Rewards     — S$500/month total spend to unlock 4 mpd

ALTER TABLE library_caps ADD COLUMN IF NOT EXISTS min_spend NUMERIC NULL;

-- UOB Visa Signature: S$1,000/month total card spend required
UPDATE library_caps
SET min_spend = 1000
WHERE card_id = '00000000-0000-0000-0001-000000000012';

-- Maybank XL Rewards: S$500/month total card spend required
UPDATE library_caps
SET min_spend = 500
WHERE card_id = '00000000-0000-0000-0001-000000000016';
