-- Migration 024: Expense tracking — cashback and debit card support

-- ── Schema additions ──────────────────────────────────────────────────────────

ALTER TABLE card_library
  ADD COLUMN IF NOT EXISTS card_type text NOT NULL DEFAULT 'miles'
    CHECK (card_type IN ('miles', 'cashback', 'debit')),
  ADD COLUMN IF NOT EXISTS cashback_rate numeric(5,4);

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS cashback_earned numeric(10,4);

-- Per-category cashback rate overrides (e.g. Citi Cash Back 8% dining)
CREATE TABLE IF NOT EXISTS library_cashback_rates (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id        uuid NOT NULL REFERENCES card_library(id) ON DELETE CASCADE,
  category_id    uuid NOT NULL REFERENCES categories(id)   ON DELETE CASCADE,
  cashback_rate  numeric(5,4) NOT NULL,
  effective_from date NOT NULL DEFAULT '2000-01-01',
  UNIQUE (card_id, category_id, effective_from)
);

ALTER TABLE library_cashback_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_all" ON library_cashback_rates FOR ALL USING (true) WITH CHECK (true);

-- ── New cards ─────────────────────────────────────────────────────────────────

-- 020: Generic Cash / Debit (no cashback)
INSERT INTO card_library (id, name, bank, card_network, base_mpd, color, mile_validity, remarks, cap_cycle, earn_increment, card_type, cashback_rate)
VALUES (
  '00000000-0000-0000-0001-000000000020',
  'Cash / Debit',
  'Cash',
  'Debit',
  0,
  '#6B7280',
  NULL,
  ARRAY['Use for cash or debit card transactions — spend is tracked but no rewards earned'],
  'calendar',
  1,
  'debit',
  NULL
) ON CONFLICT (id) DO NOTHING;

-- 021: Standard Chartered Simply Cash (1.5% flat, uncapped)
INSERT INTO card_library (id, name, bank, card_network, base_mpd, color, mile_validity, remarks, cap_cycle, earn_increment, card_type, cashback_rate)
VALUES (
  '00000000-0000-0000-0001-000000000021',
  'Simply Cash',
  'Standard Chartered',
  'Visa',
  0,
  '#0B5CAB',
  NULL,
  ARRAY['1.5% cashback on all spend, uncapped, no minimum spend'],
  'calendar',
  1,
  'cashback',
  0.015
) ON CONFLICT (id) DO NOTHING;

-- 022: UOB Absolute Cashback (1.7% flat, uncapped)
INSERT INTO card_library (id, name, bank, card_network, base_mpd, color, mile_validity, remarks, cap_cycle, earn_increment, card_type, cashback_rate)
VALUES (
  '00000000-0000-0000-0001-000000000022',
  'Absolute Cashback',
  'UOB',
  'Amex',
  0,
  '#00427E',
  NULL,
  ARRAY['1.7% cashback on all spend, uncapped, no minimum spend'],
  'calendar',
  1,
  'cashback',
  0.017
) ON CONFLICT (id) DO NOTHING;

-- 023: Citi Cash Back (0.25% base; 8% dining + groceries with S$800 min spend)
INSERT INTO card_library (id, name, bank, card_network, base_mpd, color, mile_validity, remarks, cap_cycle, earn_increment, card_type, cashback_rate)
VALUES (
  '00000000-0000-0000-0001-000000000023',
  'Citi Cash Back',
  'Citi',
  'Mastercard',
  0,
  '#D42B28',
  NULL,
  ARRAY[
    '8% cashback on dining and groceries (requires S$800/month total card spend)',
    '0.25% cashback on all other spend',
    'Cashback capped at S$25/month per category'
  ],
  'calendar',
  1,
  'cashback',
  0.0025
) ON CONFLICT (id) DO NOTHING;

-- Citi Cash Back category overrides: 8% dining (001) and groceries (002)
INSERT INTO library_cashback_rates (card_id, category_id, cashback_rate, effective_from)
VALUES
  ('00000000-0000-0000-0001-000000000023', '00000000-0000-0000-0000-000000000001', 0.08, '2000-01-01'),
  ('00000000-0000-0000-0001-000000000023', '00000000-0000-0000-0000-000000000002', 0.08, '2000-01-01')
ON CONFLICT (card_id, category_id, effective_from) DO NOTHING;
