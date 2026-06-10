-- Migration 023: Add UOB PRVI Miles Mastercard and Amex KrisFlyer Ascend
--
-- Rates sourced from milelion.com / card issuer sites. Verify with issuers.

-- ─────────────────────────────────────────────────────────────────────────────
-- UOB PRVI Miles Mastercard (card 018)
-- Same earn rates as Visa/Amex variants; Mastercard network for wider acceptance
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO card_library (id, name, bank, card_network, base_mpd, color, mile_validity, remarks, cap_cycle, earn_increment)
VALUES (
  '00000000-0000-0000-0001-000000000018',
  'PRVI Miles Mastercard',
  'UOB',
  'Mastercard',
  1.4,
  '#00427E',
  '2 years',
  ARRAY[
    '2.4 mpd on all foreign currency spend (no minimum spend, uncapped)',
    '8 mpd on Agoda and Expedia hotels (via UOB Travel portal)',
    '3 mpd on Expedia flights (via UOB Travel portal)',
    '3 mpd on IDR/MYR/THB/VND foreign currency spend'
  ],
  'calendar',
  5
) ON CONFLICT (id) DO NOTHING;

-- FCY 2.4 mpd (uncapped)
INSERT INTO library_rates (card_id, category_id, mpd, effective_from) VALUES
  ('00000000-0000-0000-0001-000000000018', '00000000-0000-0000-0000-000000000005', 2.4, '2000-01-01')
ON CONFLICT (card_id, category_id, effective_from) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- American Express KrisFlyer Ascend (card 019)
-- Issued directly by Amex SG; earn_increment = 1 (miles awarded per S$1)
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO card_library (id, name, bank, card_network, base_mpd, color, mile_validity, remarks, cap_cycle, earn_increment)
VALUES (
  '00000000-0000-0000-0001-000000000019',
  'KrisFlyer Ascend',
  'American Express',
  'Amex',
  1.2,
  '#C9A84C',
  'No expiry',
  ARRAY[
    '2 mpd on all foreign currency spend (no minimum spend, uncapped)',
    '4 complimentary Priority Pass lounge visits per year',
    '2 complimentary hotel stays at Crowne Plaza Changi Airport per year',
    'S$0 conversion fee — miles credited directly to KrisFlyer account'
  ],
  'calendar',
  1
) ON CONFLICT (id) DO NOTHING;

-- FCY 2.0 mpd (uncapped)
INSERT INTO library_rates (card_id, category_id, mpd, effective_from) VALUES
  ('00000000-0000-0000-0001-000000000019', '00000000-0000-0000-0000-000000000005', 2.0, '2000-01-01')
ON CONFLICT (card_id, category_id, effective_from) DO NOTHING;
