-- Saved transaction templates ("favourites") for quick reuse of recurring charges.
-- Stores only the reusable input fields; miles/cashback are recomputed when logged.

CREATE TABLE transaction_favourites (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label           TEXT NOT NULL,
  card_id         UUID,
  category_id     UUID,
  vendor_name     TEXT,
  mcc             TEXT,
  payment_channel TEXT,   -- 'contactless' | 'online' | 'chip' | null
  amount          NUMERIC, -- optional fixed amount; null = enter each time
  description     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE transaction_favourites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users manage own transaction favourites"
  ON transaction_favourites FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
