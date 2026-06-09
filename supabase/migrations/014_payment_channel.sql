-- Migration 014: payment_channel on library_rates
-- Some cards earn bonus miles only via a specific payment method (contactless tap or online).
-- NULL = no restriction (any payment method earns the bonus).

ALTER TABLE library_rates
  ADD COLUMN IF NOT EXISTS payment_channel TEXT NULL
    CHECK (payment_channel IN ('contactless', 'online'));

-- DBS Woman's World: online shopping bonus requires online purchase
UPDATE library_rates
SET payment_channel = 'online'
WHERE card_id = '00000000-0000-0000-0001-000000000002'
  AND category_id = '00000000-0000-0000-0000-000000000004';

-- SC Journey: dining/groceries/transport bonus applies to online SGD transactions only
UPDATE library_rates
SET payment_channel = 'online'
WHERE card_id = '00000000-0000-0000-0001-000000000004'
  AND category_id IN (
    '00000000-0000-0000-0000-000000000001',  -- dining
    '00000000-0000-0000-0000-000000000002',  -- groceries
    '00000000-0000-0000-0000-000000000008'   -- transport
  );

-- UOB Visa Signature: transport bonus is earned via contactless tap (SimplyGo etc.)
UPDATE library_rates
SET payment_channel = 'contactless'
WHERE card_id = '00000000-0000-0000-0001-000000000012'
  AND category_id = '00000000-0000-0000-0000-000000000008';

-- UOB Preferred Platinum Visa: online shopping → online; transport → contactless
UPDATE library_rates
SET payment_channel = 'online'
WHERE card_id = '00000000-0000-0000-0001-000000000013'
  AND category_id = '00000000-0000-0000-0000-000000000004';

UPDATE library_rates
SET payment_channel = 'contactless'
WHERE card_id = '00000000-0000-0000-0001-000000000013'
  AND category_id = '00000000-0000-0000-0000-000000000008';
