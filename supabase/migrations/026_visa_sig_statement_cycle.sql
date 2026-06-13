-- Migration 026: UOB Visa Signature — correct cap_cycle to 'statement'
--
-- UOB Visa Signature caps reset on the card's statement closing date, not on
-- the 1st of each calendar month. This corrects the cap_cycle flag in the
-- library so the recommendation engine uses the right period boundary.

UPDATE card_library
SET cap_cycle = 'statement'
WHERE id = '00000000-0000-0000-0001-000000000012';
