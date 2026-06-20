-- Miles balance tracking: one row per user per card.
-- opening_miles = user-inputted existing balance.
-- earned miles are summed from transactions at query time.

CREATE TABLE miles_balances (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_id      UUID NOT NULL,
  opening_miles INTEGER NOT NULL DEFAULT 0,
  expiry_date  DATE,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, card_id)
);

ALTER TABLE miles_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users manage own miles balances"
  ON miles_balances FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
