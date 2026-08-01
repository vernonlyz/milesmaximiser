-- Credit reconciliation: let a bonus mismatch be accepted so it stops flagging.
-- When the actual value is later edited the app re-arms this flag (sets it back
-- to false), so acceptance always applies to the current actual value.
ALTER TABLE credit_reconciliations
  ADD COLUMN IF NOT EXISTS mismatch_resolved BOOLEAN NOT NULL DEFAULT false;
