-- Reward-points tracking (EXPERIMENTAL, admin-gated in the UI).
--
-- Miles cards first earn a bank's own reward currency (UOB UNI$, Citi points,
-- DBS Points, …) which then converts to airline miles at a program-specific rate:
--
--     spend  →  points (base + bonus)  →  miles (÷ miles_per_point)
--
-- This mirrors the miles_accounts model but at the points layer. Balances are
-- derived from existing transactions.miles_earned ÷ miles_per_point, so no new
-- per-transaction data is needed for the first cut.
--
--   program balance = opening_points
--                   + SUM(txn.miles_earned ÷ miles_per_point) for cards mapped to
--                       this program, where txn date > as_of_date
--                   + SUM(points_adjustments.points)   -- redemptions negative
--
-- NOTE: miles_per_point values and card→program mappings below are INDICATIVE
-- starting points — verify against your statements and edit as needed.

-- ── Shared library: the reward currencies ──────────────────────────────────
CREATE TABLE reward_programs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT NOT NULL UNIQUE,   -- "UOB UNI$"
  unit_label          TEXT NOT NULL,          -- "UNI$", "pts"
  miles_per_point     NUMERIC NOT NULL,       -- 1 point → this many miles
  convert_block       INTEGER,                -- min transfer unit (points), NULL = any
  transfer_fee        NUMERIC,                -- optional per-transfer fee
  points_expiry_months INTEGER,              -- program-side expiry, NULL = none
  transfer_partner    TEXT,                   -- default airline, e.g. "KrisFlyer"
  notes               TEXT
);

-- Shared library: which currency each card earns.
CREATE TABLE card_reward_program (
  card_id    UUID PRIMARY KEY,               -- one program per card
  program_id UUID NOT NULL REFERENCES reward_programs(id) ON DELETE CASCADE
);

-- ── Per-user: points balance snapshot per program ──────────────────────────
CREATE TABLE points_accounts (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  program_id     UUID NOT NULL REFERENCES reward_programs(id) ON DELETE CASCADE,
  opening_points INTEGER NOT NULL DEFAULT 0,
  as_of_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  expiry_date    DATE,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, program_id)
);

-- Per-user: dated ledger of manual points adjustments (redemptions negative).
CREATE TABLE points_adjustments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id      UUID NOT NULL REFERENCES points_accounts(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  adjustment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  points          INTEGER NOT NULL,
  note            TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── RLS ────────────────────────────────────────────────────────────────────
-- Reward programs + card mappings are shared read-only library data.
ALTER TABLE reward_programs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_reward_program  ENABLE ROW LEVEL SECURITY;
ALTER TABLE points_accounts      ENABLE ROW LEVEL SECURITY;
ALTER TABLE points_adjustments   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reward programs are readable"     ON reward_programs     FOR SELECT USING (true);
CREATE POLICY "card reward programs are readable" ON card_reward_program FOR SELECT USING (true);

CREATE POLICY "users manage own points accounts"
  ON points_accounts FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users manage own points adjustments"
  ON points_adjustments FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── Seed: reward currencies (INDICATIVE rates — verify & edit) ──────────────
INSERT INTO reward_programs (name, unit_label, miles_per_point, convert_block, points_expiry_months, transfer_partner, notes) VALUES
  ('UOB UNI$',               'UNI$', 2.0,   NULL,  NULL, 'KrisFlyer', '1 UNI$ ≈ 2 miles. UNI$ awarded per S$5 block.'),
  ('DBS Points',             'pts',  2.0,   NULL,  NULL, 'KrisFlyer', '1 DBS Point ≈ 2 miles.'),
  ('Citi ThankYou Points',   'pts',  0.4,   NULL,  NULL, 'KrisFlyer', '10 pts ≈ 4 miles (0.4). PremierMiles earns Citi Miles ~1:1 — map separately if needed.'),
  ('HSBC Reward Points',     'pts',  0.4,   NULL,  NULL, 'KrisFlyer', '25,000 pts ≈ 10,000 miles (0.4).'),
  ('Standard Chartered 360° Rewards', 'pts', 0.4, NULL, NULL, 'KrisFlyer', 'Indicative — verify.'),
  ('Maybank TREATS Points',  'pts',  0.4,   NULL,  NULL, 'KrisFlyer', '1 TREATS Point ≈ 0.4 miles (2.5 pts per mile). XL Rewards: 1X base / 9X bonus.'),
  ('OCBC 90°N Miles',        'mi',   1.0,   NULL,  NULL, 'KrisFlyer', 'Earns 90°N miles directly (1:1 to partners).');

-- ── Seed: card → program by bank (INDICATIVE; edit per card as needed) ──────
-- Maps miles cards to their bank's main currency. Excludes cards that credit
-- miles directly (e.g. UOB KrisFlyer Visa). Auto-covers future cards of a bank.
INSERT INTO card_reward_program (card_id, program_id)
SELECT cl.id, p.id
FROM card_library cl
JOIN reward_programs p ON p.name = CASE cl.bank
    WHEN 'UOB'               THEN 'UOB UNI$'
    WHEN 'DBS'               THEN 'DBS Points'
    WHEN 'Citibank'          THEN 'Citi ThankYou Points'
    WHEN 'HSBC'              THEN 'HSBC Reward Points'
    WHEN 'Standard Chartered' THEN 'Standard Chartered 360° Rewards'
    WHEN 'Maybank'           THEN 'Maybank TREATS Points'
    WHEN 'OCBC'              THEN 'OCBC 90°N Miles'
  END
WHERE cl.card_type = 'miles'
  AND cl.name <> 'KrisFlyer Visa'   -- credits KrisFlyer miles directly, no bank points
ON CONFLICT (card_id) DO NOTHING;
