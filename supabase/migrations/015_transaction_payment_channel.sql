-- Migration 015: Per-transaction payment channel + channel-aware cap tracking
--
-- Problem: UOB Preferred Platinum and UOB Visa Signature earn 4 mpd on ANY
-- category when tapped contactlessly. The cap is also on all contactless spend
-- combined, not per-category. To track this accurately we need to know the
-- payment method for each transaction.
--
-- Changes:
--   transactions           → add payment_channel ('contactless'|'online'|'chip')
--   card_library          → add default_payment_channel for smart form defaults
--   library_caps           → add cap_payment_channel: when set, only transactions
--                            with this method count toward the cap
--   library_rates          → make category_id nullable for wildcard rates
--                            (null category = earns bonus on any spending category)

-- ── transactions ─────────────────────────────────────────────────────────────
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS payment_channel TEXT NULL
    CHECK (payment_channel IN ('contactless', 'online', 'chip'));

-- ── card_library ─────────────────────────────────────────────────────────────
ALTER TABLE card_library
  ADD COLUMN IF NOT EXISTS default_payment_channel TEXT NULL
    CHECK (default_payment_channel IN ('contactless', 'online'));

UPDATE card_library SET default_payment_channel = 'contactless'
WHERE id = '00000000-0000-0000-0001-000000000012';  -- UOB Visa Signature

UPDATE card_library SET default_payment_channel = 'contactless'
WHERE id = '00000000-0000-0000-0001-000000000013';  -- UOB Preferred Platinum Visa

UPDATE card_library SET default_payment_channel = 'online'
WHERE id = '00000000-0000-0000-0001-000000000002';  -- DBS Woman's World

UPDATE card_library SET default_payment_channel = 'online'
WHERE id = '00000000-0000-0000-0001-000000000004';  -- SC Journey

-- ── library_caps ─────────────────────────────────────────────────────────────
ALTER TABLE library_caps
  ADD COLUMN IF NOT EXISTS cap_payment_channel TEXT NULL
    CHECK (cap_payment_channel IN ('contactless', 'online'));

-- UOB Preferred Platinum: replace per-category transport cap with a contactless
-- channel cap (S$600/month across all contactless spend, any category).
DELETE FROM library_caps
WHERE card_id = '00000000-0000-0000-0001-000000000013'
  AND category_id = '00000000-0000-0000-0000-000000000008';

INSERT INTO library_caps (card_id, category_id, cap_period, spend_limit, cap_payment_channel, effective_from)
SELECT '00000000-0000-0000-0001-000000000013', NULL, 'monthly', 600.00, 'contactless', '2000-01-01'
WHERE NOT EXISTS (
  SELECT 1 FROM library_caps
  WHERE card_id = '00000000-0000-0000-0001-000000000013'
    AND category_id IS NULL
    AND cap_payment_channel = 'contactless'
);

-- UOB Visa Signature: replace per-category transport cap with a contactless
-- channel cap (S$1,200/month across all contactless spend, any category).
-- FCY (S$1,200) and petrol (S$600) category caps are kept separately.
-- Note: real-world contactless+petrol share the S$1,200 pool; modelling them
-- separately is a simplification — petrol spend at the pump is capped at S$600
-- independently, which is a conservative approximation.
DELETE FROM library_caps
WHERE card_id = '00000000-0000-0000-0001-000000000012'
  AND category_id = '00000000-0000-0000-0000-000000000008';

INSERT INTO library_caps (card_id, category_id, cap_period, spend_limit, cap_payment_channel, effective_from)
SELECT '00000000-0000-0000-0001-000000000012', NULL, 'monthly', 1200.00, 'contactless', '2000-01-01'
WHERE NOT EXISTS (
  SELECT 1 FROM library_caps
  WHERE card_id = '00000000-0000-0000-0001-000000000012'
    AND category_id IS NULL
    AND cap_payment_channel = 'contactless'
);

-- ── library_rates ─────────────────────────────────────────────────────────────
-- Make category_id nullable so a rate can apply to any spending category.
-- The FK constraint already allows NULL (Postgres FK allows NULL references).
ALTER TABLE library_rates
  ALTER COLUMN category_id DROP NOT NULL;

-- Remove the now-redundant per-category contactless rates for these cards
-- (replaced by null-category wildcard rates below).
DELETE FROM library_rates
WHERE card_id = '00000000-0000-0000-0001-000000000012'
  AND category_id = '00000000-0000-0000-0000-000000000008'
  AND payment_channel = 'contactless';

DELETE FROM library_rates
WHERE card_id = '00000000-0000-0000-0001-000000000013'
  AND category_id = '00000000-0000-0000-0000-000000000008'
  AND payment_channel = 'contactless';

-- UOB Visa Signature: 4 mpd on any category when tapped contactlessly
INSERT INTO library_rates (card_id, category_id, mpd, payment_channel, effective_from)
SELECT '00000000-0000-0000-0001-000000000012', NULL, 4.0, 'contactless', '2000-01-01'
WHERE NOT EXISTS (
  SELECT 1 FROM library_rates
  WHERE card_id = '00000000-0000-0000-0001-000000000012'
    AND category_id IS NULL
    AND payment_channel = 'contactless'
);

-- UOB Preferred Platinum Visa: 4 mpd on any category when tapped contactlessly
INSERT INTO library_rates (card_id, category_id, mpd, payment_channel, effective_from)
SELECT '00000000-0000-0000-0001-000000000013', NULL, 4.0, 'contactless', '2000-01-01'
WHERE NOT EXISTS (
  SELECT 1 FROM library_rates
  WHERE card_id = '00000000-0000-0000-0001-000000000013'
    AND category_id IS NULL
    AND payment_channel = 'contactless'
);
