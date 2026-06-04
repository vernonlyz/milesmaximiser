-- MilesMaximiser seed data — Singapore credit cards
-- Run AFTER 001_initial_schema.sql
-- Rates are approximate; update them to match your actual card terms.

-- ─────────────────────────────────────────────────────────────────────────────
-- Categories
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO categories (id, name, icon) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Dining',           '🍽️'),
  ('00000000-0000-0000-0000-000000000002', 'Groceries',        '🛒'),
  ('00000000-0000-0000-0000-000000000003', 'Petrol',           '⛽'),
  ('00000000-0000-0000-0000-000000000004', 'Online Shopping',  '🛍️'),
  ('00000000-0000-0000-0000-000000000005', 'Overseas Spend',   '🌏'),
  ('00000000-0000-0000-0000-000000000006', 'Travel',           '✈️'),
  ('00000000-0000-0000-0000-000000000007', 'Entertainment',    '🎬'),
  ('00000000-0000-0000-0000-000000000008', 'Transport',        '🚕'),
  ('00000000-0000-0000-0000-000000000009', 'Utilities & Bills','💡'),
  ('00000000-0000-0000-0000-000000000010', 'Others',           '💳')
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- Credit cards
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO credit_cards (id, name, bank, card_network, base_mpd, color) VALUES
  ('00000000-0000-0000-0001-000000000001', 'Altitude Visa Signature',  'DBS',               'Visa',       1.2,  '#E31E35'),
  ('00000000-0000-0000-0001-000000000002', 'Woman''s World Card',        'DBS',               'Mastercard', 1.5,  '#C0162E'),
  ('00000000-0000-0000-0001-000000000003', 'PRVI Miles Visa',           'UOB',               'Visa',       1.4,  '#00427E'),
  ('00000000-0000-0000-0001-000000000004', 'Journey Credit Card',       'Standard Chartered','Visa',       1.2,  '#00854A'),
  ('00000000-0000-0000-0001-000000000005', 'PremierMiles Visa',         'Citibank',          'Visa',       1.2,  '#003882'),
  ('00000000-0000-0000-0001-000000000006', '90°N Visa',                 'OCBC',              'Visa',       1.2,  '#BE1833'),
  ('00000000-0000-0000-0001-000000000007', 'TravelOne Visa',            'HSBC',              'Visa',       1.2,  '#DB0011'),
  ('00000000-0000-0000-0001-000000000008', 'Horizon Visa Signature',    'Maybank',           'Visa',       0.4,  '#F7A900')
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- Card rates (bonus MPD per category)
-- ─────────────────────────────────────────────────────────────────────────────

-- DBS Altitude Visa — bonus on Travel and Overseas
INSERT INTO card_rates (card_id, category_id, mpd) VALUES
  ('00000000-0000-0000-0001-000000000001', '00000000-0000-0000-0000-000000000005', 2.0),  -- Overseas
  ('00000000-0000-0000-0001-000000000001', '00000000-0000-0000-0000-000000000006', 3.0)   -- Travel (online booking)
ON CONFLICT (card_id, category_id) DO NOTHING;

-- DBS Woman's World — 4 mpd online shopping, 2 mpd overseas
INSERT INTO card_rates (card_id, category_id, mpd) VALUES
  ('00000000-0000-0000-0001-000000000002', '00000000-0000-0000-0000-000000000004', 4.0),  -- Online Shopping
  ('00000000-0000-0000-0001-000000000002', '00000000-0000-0000-0000-000000000005', 2.0)   -- Overseas
ON CONFLICT (card_id, category_id) DO NOTHING;

-- UOB PRVI Miles — 2.4 mpd overseas
INSERT INTO card_rates (card_id, category_id, mpd) VALUES
  ('00000000-0000-0000-0001-000000000003', '00000000-0000-0000-0000-000000000005', 2.4),  -- Overseas
  ('00000000-0000-0000-0001-000000000003', '00000000-0000-0000-0000-000000000006', 3.0)   -- Travel (SIA/Scoot)
ON CONFLICT (card_id, category_id) DO NOTHING;

-- SC Journey — 3 mpd dining/groceries/petrol (monthly cap $1,000 combined; modelled individually)
INSERT INTO card_rates (card_id, category_id, mpd) VALUES
  ('00000000-0000-0000-0001-000000000004', '00000000-0000-0000-0000-000000000001', 3.0),  -- Dining
  ('00000000-0000-0000-0001-000000000004', '00000000-0000-0000-0000-000000000002', 3.0),  -- Groceries
  ('00000000-0000-0000-0001-000000000004', '00000000-0000-0000-0000-000000000003', 3.0),  -- Petrol
  ('00000000-0000-0000-0001-000000000004', '00000000-0000-0000-0000-000000000005', 2.0)   -- Overseas
ON CONFLICT (card_id, category_id) DO NOTHING;

-- Citi PremierMiles — 2 mpd overseas
INSERT INTO card_rates (card_id, category_id, mpd) VALUES
  ('00000000-0000-0000-0001-000000000005', '00000000-0000-0000-0000-000000000005', 2.0)   -- Overseas
ON CONFLICT (card_id, category_id) DO NOTHING;

-- OCBC 90°N — 2.1 mpd overseas
INSERT INTO card_rates (card_id, category_id, mpd) VALUES
  ('00000000-0000-0000-0001-000000000006', '00000000-0000-0000-0000-000000000005', 2.1)   -- Overseas
ON CONFLICT (card_id, category_id) DO NOTHING;

-- HSBC TravelOne — 2.4 mpd overseas
INSERT INTO card_rates (card_id, category_id, mpd) VALUES
  ('00000000-0000-0000-0001-000000000007', '00000000-0000-0000-0000-000000000005', 2.4)   -- Overseas
ON CONFLICT (card_id, category_id) DO NOTHING;

-- Maybank Horizon — petrol 3.2 mpd, dining/transport/travel 2 mpd, overseas 2 mpd
INSERT INTO card_rates (card_id, category_id, mpd) VALUES
  ('00000000-0000-0000-0001-000000000008', '00000000-0000-0000-0000-000000000001', 2.0),  -- Dining
  ('00000000-0000-0000-0001-000000000008', '00000000-0000-0000-0000-000000000003', 3.2),  -- Petrol
  ('00000000-0000-0000-0001-000000000008', '00000000-0000-0000-0000-000000000005', 2.0),  -- Overseas
  ('00000000-0000-0000-0001-000000000008', '00000000-0000-0000-0000-000000000006', 2.0),  -- Travel
  ('00000000-0000-0000-0001-000000000008', '00000000-0000-0000-0000-000000000008', 2.0)   -- Transport
ON CONFLICT (card_id, category_id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- Spending caps
-- ─────────────────────────────────────────────────────────────────────────────

-- DBS Altitude — Travel capped at $5,000/month (generous; effectively uncapped for most)
INSERT INTO spending_caps (card_id, category_id, cap_period, spend_limit) VALUES
  ('00000000-0000-0000-0001-000000000001', '00000000-0000-0000-0000-000000000006', 'monthly', 5000.00);

-- DBS Woman's World — Online Shopping capped at $1,500/month
INSERT INTO spending_caps (card_id, category_id, cap_period, spend_limit) VALUES
  ('00000000-0000-0000-0001-000000000002', '00000000-0000-0000-0000-000000000004', 'monthly', 1500.00);

-- SC Journey — Dining capped at $1,000/month
--   Note: the actual card has a $1,000 COMBINED cap across dining+groceries+petrol.
--   For MVP each category gets its own $1,000 cap. Adjust as needed.
INSERT INTO spending_caps (card_id, category_id, cap_period, spend_limit) VALUES
  ('00000000-0000-0000-0001-000000000004', '00000000-0000-0000-0000-000000000001', 'monthly', 1000.00),
  ('00000000-0000-0000-0001-000000000004', '00000000-0000-0000-0000-000000000002', 'monthly', 1000.00),
  ('00000000-0000-0000-0001-000000000004', '00000000-0000-0000-0000-000000000003', 'monthly', 1000.00);

-- Maybank Horizon — Petrol $200/month, Dining/Transport/Travel $800/month each
INSERT INTO spending_caps (card_id, category_id, cap_period, spend_limit) VALUES
  ('00000000-0000-0000-0001-000000000008', '00000000-0000-0000-0000-000000000003', 'monthly', 200.00),
  ('00000000-0000-0000-0001-000000000008', '00000000-0000-0000-0000-000000000001', 'monthly', 800.00),
  ('00000000-0000-0000-0001-000000000008', '00000000-0000-0000-0000-000000000006', 'monthly', 800.00),
  ('00000000-0000-0000-0001-000000000008', '00000000-0000-0000-0000-000000000008', 'monthly', 800.00);
