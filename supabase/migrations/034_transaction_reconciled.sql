-- Per-transaction reconciliation flag: user checks each off against their bank statement.

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS reconciled BOOLEAN NOT NULL DEFAULT false;
