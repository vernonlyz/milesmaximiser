-- Migration 017: Remove petrol-specific rate and cap for UOB Visa Signature
--
-- Previously, petrol (category 003) had its own 4 mpd rate and S$600/month cap.
-- This was inaccurate: UOB Visa Sig earns 4 mpd at petrol stations via contactless
-- payment, and that spend draws from the same S$1,200/month pool as all other
-- contactless spend. Modelling petrol separately created a wrong S$600 sub-limit
-- and allowed petrol to earn 4 mpd without a contactless payment channel.
--
-- After this migration:
--   - Petrol logged as 'contactless' → hits the contactless wildcard rate (4 mpd)
--     and draws from the S$1,200/month contactless channel cap. Correct.
--   - Petrol logged without contactless (chip/other) → earns base rate (0.4 mpd). Correct.

DELETE FROM library_rates
WHERE card_id = '00000000-0000-0000-0001-000000000012'
  AND category_id = '00000000-0000-0000-0000-000000000003';

DELETE FROM library_caps
WHERE card_id = '00000000-0000-0000-0001-000000000012'
  AND category_id = '00000000-0000-0000-0000-000000000003';

UPDATE card_library
SET remarks = ARRAY[
  'Requires S$1,000/month total spend to unlock 4 mpd — earns 0.4 mpd base rate otherwise',
  '4 mpd on all tap-to-pay spend (any category, incl. petrol) — S$1,200/month cap',
  '4 mpd on overseas FCY — S$1,200/month cap (separate from contactless pool)'
]
WHERE id = '00000000-0000-0000-0001-000000000012';
