-- Optional target balance per miles account (e.g. 100,000 KrisFlyer for a redemption).
-- Progress is computed client-side from the account total.

ALTER TABLE miles_accounts
  ADD COLUMN IF NOT EXISTS goal_miles INTEGER;
