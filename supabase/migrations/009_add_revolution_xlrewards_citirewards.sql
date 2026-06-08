-- MilesMaximiser — add HSBC Revolution, Maybank XL Rewards, Citi Rewards Mastercard
--
-- New card IDs:
--   HSBC Revolution:         00000000-0000-0000-0001-000000000015
--   Maybank XL Rewards:      00000000-0000-0000-0001-000000000016
--   Citi Rewards Mastercard: 00000000-0000-0000-0001-000000000017

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Card library entries
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO card_library (id, name, bank, card_network, base_mpd, color, mile_validity, remarks) VALUES
  (
    '00000000-0000-0000-0001-000000000015',
    'Revolution',
    'HSBC',
    'Visa',
    0.4,
    '#C62828',
    '37 months',
    ARRAY[
      'No annual fee',
      '4 mpd on dining, shopping, transport and travel (contactless and online)',
      'S$1,000/month combined cap across all bonus categories',
      '8 mpd available with S$50,000 ADB in HSBC Everyday Global Account',
      '20 transfer partners, instant transfers with no conversion fee'
    ]
  ),
  (
    '00000000-0000-0000-0001-000000000016',
    'XL Rewards',
    'Maybank',
    'Visa',
    0.4,
    '#FF8F00',
    '12 months',
    ARRAY[
      'Age restriction: applicants must be 21–39 at time of application',
      'S$500/month minimum spend required to unlock 4 mpd bonus rates',
      'S$1,000/month combined cap on all bonus categories',
      '4 mpd on ALL foreign currency spend (no MCC restrictions)',
      'Annual fee waived first 2 years, then waivable with S$6,000 annual spend'
    ]
  ),
  (
    '00000000-0000-0000-0001-000000000017',
    'Rewards Mastercard',
    'Citibank',
    'Mastercard',
    0.4,
    '#0288D1',
    '5 years',
    ARRAY[
      '4 mpd on all online purchases and in-store fashion (bags, shoes, clothing)',
      'Travel bookings (airlines, hotels) excluded from 4 mpd online bonus',
      'S$1,000/month combined cap on bonus categories',
      'No lounge access'
    ]
  )
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Bonus rates
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO library_rates (card_id, category_id, mpd, effective_from) VALUES
  -- HSBC Revolution — 4 mpd on dining, online shopping, transport, travel
  ('00000000-0000-0000-0001-000000000015', '00000000-0000-0000-0000-000000000001', 4.0, '2000-01-01'),  -- dining
  ('00000000-0000-0000-0001-000000000015', '00000000-0000-0000-0000-000000000004', 4.0, '2000-01-01'),  -- online shopping
  ('00000000-0000-0000-0001-000000000015', '00000000-0000-0000-0000-000000000008', 4.0, '2000-01-01'),  -- transport
  ('00000000-0000-0000-0001-000000000015', '00000000-0000-0000-0000-000000000006', 4.0, '2000-01-01'),  -- travel
  -- Maybank XL Rewards — 4 mpd on dining, FCY, travel, entertainment, online shopping
  ('00000000-0000-0000-0001-000000000016', '00000000-0000-0000-0000-000000000001', 4.0, '2000-01-01'),  -- dining
  ('00000000-0000-0000-0001-000000000016', '00000000-0000-0000-0000-000000000005', 4.0, '2000-01-01'),  -- overseas/FCY
  ('00000000-0000-0000-0001-000000000016', '00000000-0000-0000-0000-000000000006', 4.0, '2000-01-01'),  -- travel
  ('00000000-0000-0000-0001-000000000016', '00000000-0000-0000-0000-000000000007', 4.0, '2000-01-01'),  -- entertainment
  ('00000000-0000-0000-0001-000000000016', '00000000-0000-0000-0000-000000000004', 4.0, '2000-01-01'),  -- online shopping
  -- Citi Rewards Mastercard — 4 mpd on online shopping and fashion
  ('00000000-0000-0000-0001-000000000017', '00000000-0000-0000-0000-000000000004', 4.0, '2000-01-01'),  -- online shopping
  ('00000000-0000-0000-0001-000000000017', '00000000-0000-0000-0000-000000000009', 4.0, '2000-01-01')   -- fashion
ON CONFLICT (card_id, category_id, effective_from) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Spending caps
-- All three cards have combined caps across bonus categories.
-- Modelled per-category; see remarks for combined cap caveat.
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO library_caps (card_id, category_id, cap_period, spend_limit, effective_from) VALUES
  -- HSBC Revolution — S$1,000/month combined across dining, shopping, transport, travel
  ('00000000-0000-0000-0001-000000000015', '00000000-0000-0000-0000-000000000001', 'monthly', 1000.00, '2000-01-01'),
  ('00000000-0000-0000-0001-000000000015', '00000000-0000-0000-0000-000000000004', 'monthly', 1000.00, '2000-01-01'),
  ('00000000-0000-0000-0001-000000000015', '00000000-0000-0000-0000-000000000008', 'monthly', 1000.00, '2000-01-01'),
  ('00000000-0000-0000-0001-000000000015', '00000000-0000-0000-0000-000000000006', 'monthly', 1000.00, '2000-01-01'),
  -- Maybank XL Rewards — S$1,000/month combined across all bonus categories
  ('00000000-0000-0000-0001-000000000016', '00000000-0000-0000-0000-000000000001', 'monthly', 1000.00, '2000-01-01'),
  ('00000000-0000-0000-0001-000000000016', '00000000-0000-0000-0000-000000000005', 'monthly', 1000.00, '2000-01-01'),
  ('00000000-0000-0000-0001-000000000016', '00000000-0000-0000-0000-000000000006', 'monthly', 1000.00, '2000-01-01'),
  ('00000000-0000-0000-0001-000000000016', '00000000-0000-0000-0000-000000000007', 'monthly', 1000.00, '2000-01-01'),
  ('00000000-0000-0000-0001-000000000016', '00000000-0000-0000-0000-000000000004', 'monthly', 1000.00, '2000-01-01'),
  -- Citi Rewards Mastercard — S$1,000/month combined across online shopping and fashion
  ('00000000-0000-0000-0001-000000000017', '00000000-0000-0000-0000-000000000004', 'monthly', 1000.00, '2000-01-01'),
  ('00000000-0000-0000-0001-000000000017', '00000000-0000-0000-0000-000000000009', 'monthly', 1000.00, '2000-01-01')
ON CONFLICT DO NOTHING;
