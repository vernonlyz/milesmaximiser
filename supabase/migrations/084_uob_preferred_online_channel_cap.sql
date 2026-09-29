-- 084: UOB Preferred Visa (id ...013) — model the online bonus as ONE online-channel
-- cap instead of per-category caps.
--
-- Since 1 Oct 2025 the card has two strictly-separate S$600/month sub-caps: mobile
-- contactless (all spend) and selected online (whitelisted MCCs). Our model already
-- had the contactless channel cap, but the online side was split into per-category
-- rates/caps (Online Shopping 004 + Transport 008 — and transport isn't even in the
-- online list), so the Dashboard showed category bars. Replace those with a single
-- online-channel rate + cap; the hybrid mcc_mode still gates which online MCCs earn.
-- Verified vs MileLion (29-Mar-2026). Idempotent.

-- Drop the per-category online rates + caps.
DELETE FROM library_rates
  WHERE card_id = '00000000-0000-0000-0001-000000000013'
    AND category_id IN ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000008')
    AND payment_channel IS NULL;
DELETE FROM library_caps
  WHERE card_id = '00000000-0000-0000-0001-000000000013'
    AND category_id IN ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000008')
    AND cap_payment_channel IS NULL;

-- Single online-channel bonus rate (4 mpd) + S$600/mo online cap. The contactless
-- channel rate/cap already exist (migrations 054/057 / seed).
INSERT INTO library_rates (card_id, category_id, mpd, payment_channel, effective_from)
SELECT '00000000-0000-0000-0001-000000000013', NULL, 4.0, 'online', '2000-01-01'
WHERE NOT EXISTS (SELECT 1 FROM library_rates
  WHERE card_id = '00000000-0000-0000-0001-000000000013' AND category_id IS NULL AND payment_channel = 'online');

INSERT INTO library_caps (card_id, category_id, cap_period, spend_limit, cap_payment_channel, effective_from)
SELECT '00000000-0000-0000-0001-000000000013', NULL, 'monthly', 600.00, 'online', '2000-01-01'
WHERE NOT EXISTS (SELECT 1 FROM library_caps
  WHERE card_id = '00000000-0000-0000-0001-000000000013' AND category_id IS NULL AND cap_payment_channel = 'online');
