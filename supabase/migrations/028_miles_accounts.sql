-- Miles accounts: supersedes miles_balances (027).
-- An "account" owns a miles balance. A normal card = account with one card linked;
-- a pooled programme (e.g. UOB) = one account with several cards linked.
--
--   account total = opening_miles
--                 + SUM(transactions.miles_earned for linked cards where date > as_of_date)
--                 + SUM(adjustments.miles)   -- redemptions negative, bonuses positive

CREATE TABLE miles_accounts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  opening_miles INTEGER NOT NULL DEFAULT 0,
  as_of_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  expiry_date   DATE,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Which cards feed an account. A card belongs to exactly one account.
CREATE TABLE miles_account_cards (
  account_id UUID NOT NULL REFERENCES miles_accounts(id) ON DELETE CASCADE,
  card_id    UUID NOT NULL,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  PRIMARY KEY (account_id, card_id),
  UNIQUE (user_id, card_id)
);

-- Dated ledger of manual adjustments: redemptions (negative) and bonuses (positive).
CREATE TABLE miles_adjustments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id      UUID NOT NULL REFERENCES miles_accounts(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  adjustment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  miles           INTEGER NOT NULL,
  note            TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE miles_accounts      ENABLE ROW LEVEL SECURITY;
ALTER TABLE miles_account_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE miles_adjustments   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users manage own miles accounts"
  ON miles_accounts FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users manage own miles account cards"
  ON miles_account_cards FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users manage own miles adjustments"
  ON miles_adjustments FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Migrate any existing miles_balances rows into one account per card.
DO $$
DECLARE
  b           RECORD;
  new_account UUID;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'miles_balances') THEN
    FOR b IN SELECT user_id, card_id, opening_miles, expiry_date FROM miles_balances LOOP
      INSERT INTO miles_accounts (user_id, name, opening_miles, expiry_date)
      VALUES (b.user_id, 'Card balance', b.opening_miles, b.expiry_date)
      RETURNING id INTO new_account;

      INSERT INTO miles_account_cards (account_id, card_id, user_id)
      VALUES (new_account, b.card_id, b.user_id)
      ON CONFLICT DO NOTHING;
    END LOOP;

    DROP TABLE miles_balances;
  END IF;
END $$;
