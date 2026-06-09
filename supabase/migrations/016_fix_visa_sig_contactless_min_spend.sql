-- Migration 016: Backfill min_spend on UOB Visa Signature contactless channel cap
--
-- Bug: migration 015 inserted the contactless channel cap for UOB Visa Sig
-- without min_spend, because migration 013's bulk UPDATE only applied to rows
-- that existed at that time. The cap row therefore had min_spend = NULL,
-- so the recommender never showed the S$1,000 threshold bar for this card.

UPDATE library_caps
SET min_spend = 1000
WHERE card_id = '00000000-0000-0000-0001-000000000012'
  AND category_id IS NULL
  AND cap_payment_channel = 'contactless'
  AND min_spend IS NULL;
