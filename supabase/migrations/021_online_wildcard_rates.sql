-- Migration 021: wildcard online rates for DBS Woman's World and Citi Rewards
--
-- Both cards earn 4 mpd on ALL online purchases regardless of spending category.
-- Previously modelled as a category-specific "Online Shopping" rate, which missed
-- online spend in Dining, Groceries, Travel, etc.
--
-- Pattern: category_id = NULL + payment_channel = 'online' (wildcard online rate).
-- The engine prefers the higher-earning rate, so the wildcard online beats any
-- lower per-category rate when the user taps "Online" as the payment method.

-- ─────────────────────────────────────────────────────────────────────────────
-- DBS Woman's World (card 002)
-- ─────────────────────────────────────────────────────────────────────────────

-- Remove old category-specific Online Shopping rate (now superseded by wildcard)
DELETE FROM library_rates
WHERE card_id    = '00000000-0000-0000-0001-000000000002'
  AND category_id = '00000000-0000-0000-0000-000000000004'
  AND payment_channel = 'online';

-- Add wildcard online rate: any category earns 4 mpd when paid online
INSERT INTO library_rates (card_id, category_id, mpd, payment_channel, effective_from)
SELECT '00000000-0000-0000-0001-000000000002', NULL, 4.0, 'online', '2000-01-01'
WHERE NOT EXISTS (
  SELECT 1 FROM library_rates
  WHERE card_id = '00000000-0000-0000-0001-000000000002'
    AND category_id IS NULL AND payment_channel = 'online'
);

-- Convert old Online Shopping category cap to a channel cap (tracks all online spend)
DELETE FROM library_caps
WHERE card_id    = '00000000-0000-0000-0001-000000000002'
  AND category_id = '00000000-0000-0000-0000-000000000004';

INSERT INTO library_caps (card_id, category_id, cap_period, spend_limit, cap_payment_channel, effective_from)
SELECT '00000000-0000-0000-0001-000000000002', NULL, 'monthly', 1000.00, 'online', '2000-01-01'
WHERE NOT EXISTS (
  SELECT 1 FROM library_caps
  WHERE card_id = '00000000-0000-0000-0001-000000000002'
    AND category_id IS NULL AND cap_payment_channel = 'online'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Citi Rewards Mastercard (card 017)
-- ─────────────────────────────────────────────────────────────────────────────

-- Remove old category-specific Online Shopping rate
DELETE FROM library_rates
WHERE card_id    = '00000000-0000-0000-0001-000000000017'
  AND category_id = '00000000-0000-0000-0000-000000000004';

-- Add wildcard online rate: any category earns 4 mpd when paid online
INSERT INTO library_rates (card_id, category_id, mpd, payment_channel, effective_from)
SELECT '00000000-0000-0000-0001-000000000017', NULL, 4.0, 'online', '2000-01-01'
WHERE NOT EXISTS (
  SELECT 1 FROM library_rates
  WHERE card_id = '00000000-0000-0000-0001-000000000017'
    AND category_id IS NULL AND payment_channel = 'online'
);

-- Remove old Online Shopping category cap (replacing with channel cap)
-- Also remove it from the bonus cap_group since channel caps can't share a group
DELETE FROM library_caps
WHERE card_id    = '00000000-0000-0000-0001-000000000017'
  AND category_id = '00000000-0000-0000-0000-000000000004';

-- Add channel cap: tracks all online spend against the $1,000/month limit
INSERT INTO library_caps (card_id, category_id, cap_period, spend_limit, cap_payment_channel, effective_from)
SELECT '00000000-0000-0000-0001-000000000017', NULL, 'monthly', 1000.00, 'online', '2000-01-01'
WHERE NOT EXISTS (
  SELECT 1 FROM library_caps
  WHERE card_id = '00000000-0000-0000-0001-000000000017'
    AND category_id IS NULL AND cap_payment_channel = 'online'
);

-- The fashion (011) cap stays as a separate $1,000/month category cap.
-- Note: Citi's actual combined online+fashion cap ($1,000/month total) cannot be
-- modelled as a single shared limit when using mixed cap types; online and fashion
-- caps therefore track separately in the engine.

-- ─────────────────────────────────────────────────────────────────────────────
-- default_payment_channel: auto-select "Online" in the log form for these cards
-- ─────────────────────────────────────────────────────────────────────────────

-- DBS Woman's World already set in migration 015; Citi Rewards needs it now
UPDATE card_library SET default_payment_channel = 'online'
WHERE id = '00000000-0000-0000-0001-000000000017';
