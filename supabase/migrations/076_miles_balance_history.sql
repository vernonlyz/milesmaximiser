-- Dated snapshots of a miles account's total balance, so past balances are kept
-- (Reconcile overwrites opening_miles/as_of_date, which otherwise loses history).
--   source 'reconcile' — auto-saved when the account is reconciled
--   source 'manual'    — saved via the "Save snapshot" button
CREATE TABLE IF NOT EXISTS miles_balance_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL,
  account_id  UUID NOT NULL REFERENCES miles_accounts(id) ON DELETE CASCADE,
  balance     NUMERIC NOT NULL,
  as_of_date  DATE NOT NULL,
  source      TEXT NOT NULL DEFAULT 'manual',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE miles_balance_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own miles history" ON miles_balance_history;
CREATE POLICY "own miles history" ON miles_balance_history
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
