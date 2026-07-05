-- Per-transaction base-point reconciliation (EXPERIMENTAL, admin-gated).
--
-- UOB (and similar) credit BASE points per transaction on posting, so base is
-- reconciled at the transaction grain. Bonus is credited as an accumulated lump
-- on the statement, reconciled at the cycle grain via credit_reconciliations.
--
-- Only the reconciled flag is persisted; expected base/bonus are recomputed from
-- the transaction's earned miles.

CREATE TABLE transaction_point_recon (
  transaction_id  UUID PRIMARY KEY,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  base_reconciled BOOLEAN NOT NULL DEFAULT false,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE transaction_point_recon ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users manage own transaction point recon"
  ON transaction_point_recon FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
