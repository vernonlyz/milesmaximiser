-- Bonus-eligible MCCs per card (reference data; card terms, read-only for users).
-- Stored as ranges: mcc_start = mcc_end for single codes. An MCC is bonus-eligible
-- when it falls within any row's [mcc_start, mcc_end] for that card.

-- Missing MCC descriptions used below (idempotent).
INSERT INTO mcc_catalogue (code, description, default_category_id) VALUES
  ('7231', 'Beauty and Barber Shops',            '00000000-0000-0000-0000-000000000012'),
  ('7298', 'Health and Beauty Spas',             '00000000-0000-0000-0000-000000000012'),
  ('5655', 'Sports and Riding Apparel Stores',   '00000000-0000-0000-0000-000000000011'),
  ('5948', 'Luggage and Leather Goods Stores',   '00000000-0000-0000-0000-000000000011'),
  ('4582', 'Airports, Flying Fields',            '00000000-0000-0000-0000-000000000006'),
  ('5309', 'Duty Free Stores',                   '00000000-0000-0000-0000-000000000006')
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS card_mcc_eligibility (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id        UUID NOT NULL,
  category_label TEXT,            -- the card's bonus category grouping (display)
  mcc_start      TEXT NOT NULL,
  mcc_end        TEXT NOT NULL,   -- = mcc_start for a single code
  note           TEXT             -- friendly label, esp. for ranges
);

ALTER TABLE card_mcc_eligibility ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "card mcc eligibility readable" ON card_mcc_eligibility;
CREATE POLICY "card mcc eligibility readable" ON card_mcc_eligibility FOR SELECT USING (true);

-- ── Seed: UOB Lady's Solitaire (card ...011) ─────────────────────────────────
DELETE FROM card_mcc_eligibility WHERE card_id = '00000000-0000-0000-0001-000000000011';
INSERT INTO card_mcc_eligibility (card_id, category_label, mcc_start, mcc_end, note) VALUES
  -- Beauty
  ('00000000-0000-0000-0001-000000000011', 'Beauty', '5912', '5912', NULL),
  ('00000000-0000-0000-0001-000000000011', 'Beauty', '5977', '5977', NULL),
  ('00000000-0000-0000-0001-000000000011', 'Beauty', '7230', '7230', NULL),
  ('00000000-0000-0000-0001-000000000011', 'Beauty', '7231', '7231', NULL),
  ('00000000-0000-0000-0001-000000000011', 'Beauty', '7297', '7297', NULL),
  ('00000000-0000-0000-0001-000000000011', 'Beauty', '7298', '7298', NULL),
  -- Dining
  ('00000000-0000-0000-0001-000000000011', 'Dining', '5811', '5811', NULL),
  ('00000000-0000-0000-0001-000000000011', 'Dining', '5812', '5812', NULL),
  ('00000000-0000-0000-0001-000000000011', 'Dining', '5814', '5814', NULL),
  ('00000000-0000-0000-0001-000000000011', 'Dining', '5499', '5499', NULL),
  -- Entertainment
  ('00000000-0000-0000-0001-000000000011', 'Entertainment', '5813', '5813', NULL),
  ('00000000-0000-0000-0001-000000000011', 'Entertainment', '7832', '7832', NULL),
  ('00000000-0000-0000-0001-000000000011', 'Entertainment', '7922', '7922', NULL),
  -- Family
  ('00000000-0000-0000-0001-000000000011', 'Family', '5411', '5411', NULL),
  ('00000000-0000-0000-0001-000000000011', 'Family', '5641', '5641', NULL),
  -- Fashion
  ('00000000-0000-0000-0001-000000000011', 'Fashion', '5311', '5311', NULL),
  ('00000000-0000-0000-0001-000000000011', 'Fashion', '5611', '5611', NULL),
  ('00000000-0000-0000-0001-000000000011', 'Fashion', '5621', '5621', NULL),
  ('00000000-0000-0000-0001-000000000011', 'Fashion', '5631', '5631', NULL),
  ('00000000-0000-0000-0001-000000000011', 'Fashion', '5651', '5651', NULL),
  ('00000000-0000-0000-0001-000000000011', 'Fashion', '5655', '5655', NULL),
  ('00000000-0000-0000-0001-000000000011', 'Fashion', '5661', '5661', NULL),
  ('00000000-0000-0000-0001-000000000011', 'Fashion', '5691', '5691', NULL),
  ('00000000-0000-0000-0001-000000000011', 'Fashion', '5699', '5699', NULL),
  ('00000000-0000-0000-0001-000000000011', 'Fashion', '5948', '5948', NULL),
  -- Transport
  ('00000000-0000-0000-0001-000000000011', 'Transport', '4111', '4111', NULL),
  ('00000000-0000-0000-0001-000000000011', 'Transport', '4121', '4121', NULL),
  ('00000000-0000-0000-0001-000000000011', 'Transport', '4789', '4789', NULL),
  ('00000000-0000-0000-0001-000000000011', 'Transport', '5541', '5541', NULL),
  ('00000000-0000-0000-0001-000000000011', 'Transport', '5542', '5542', NULL),
  -- Travel
  ('00000000-0000-0000-0001-000000000011', 'Travel', '3000', '3299', 'Airlines'),
  ('00000000-0000-0000-0001-000000000011', 'Travel', '3500', '3999', 'Hotels & car rental'),
  ('00000000-0000-0000-0001-000000000011', 'Travel', '4411', '4411', NULL),
  ('00000000-0000-0000-0001-000000000011', 'Travel', '4511', '4511', NULL),
  ('00000000-0000-0000-0001-000000000011', 'Travel', '4582', '4582', NULL),
  ('00000000-0000-0000-0001-000000000011', 'Travel', '4722', '4722', NULL),
  ('00000000-0000-0000-0001-000000000011', 'Travel', '5309', '5309', NULL),
  ('00000000-0000-0000-0001-000000000011', 'Travel', '7011', '7011', NULL);
