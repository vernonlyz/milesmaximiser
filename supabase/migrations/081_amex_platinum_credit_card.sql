-- 081: Add the American Express Platinum Credit Card (id ...025).
--
-- Flat miles card. Base earn is 2 Membership Rewards pts per S$1.60 on BOTH local
-- and FCY spend (1.25 MR/$), converted to KrisFlyer at 550 MR : 250 miles
-- (post-23-Feb-2026 rate, no transfer fee) → net ≈ 0.57 mpd. Modelled in mpd
-- directly (like the KrisFlyer-direct cards), so no reward-program mapping.
--
-- The only accelerator is the 10Xcelerator programme (~2.84 mpd), which is tied to
-- specific partner MERCHANTS, not MCC categories — seeding it as a category rate
-- would wrongly apply to whole categories, so it lives in remarks. No caps, no
-- bonus-category rates, no mcc_mode. Membership Rewards points do not expire.
--
-- Verified against MileLion's 24-Feb-2026 review + Amex SG. Idempotent.

INSERT INTO card_library (id, name, bank, card_network, base_mpd, color, mile_validity, remarks, cap_cycle, earn_increment, card_type, cashback_rate) VALUES
  ('00000000-0000-0000-0001-000000000025', 'Platinum Credit Card', 'American Express', 'Amex', 0.57, '#8E8E93', 'No expiry',
     ARRAY[
       'S$327 annual fee',
       'Base 2 Membership Rewards pts per S$1.60 on local and FCY spend (~0.57 mpd after conversion)',
       '10Xcelerator partner outlets earn ~2.84 mpd (10 MR pts per S$1.60) — merchant-specific, uncapped, no min spend',
       'Membership Rewards → KrisFlyer at 550:250 (since 23 Feb 2026), no conversion fee; MR points do not expire'
     ], 'calendar', 5, 'miles', NULL)
ON CONFLICT (id) DO NOTHING;
