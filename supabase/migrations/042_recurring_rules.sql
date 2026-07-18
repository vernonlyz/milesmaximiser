-- Recurring rules that generate real future transactions.
--
-- A recurring favourite becomes a rule: repeat every N units (day/week/month/year)
-- from start_date, ending on end_date or after max_occurrences. Occurrences are
-- materialised as real transactions (so they count toward caps for planning),
-- linked back via transactions.recurring_id.

ALTER TABLE transaction_favourites
  ADD COLUMN IF NOT EXISTS recur_unit      TEXT,               -- 'day' | 'week' | 'month' | 'year'
  ADD COLUMN IF NOT EXISTS recur_interval  INTEGER NOT NULL DEFAULT 1,  -- every N units
  ADD COLUMN IF NOT EXISTS start_date      DATE,
  ADD COLUMN IF NOT EXISTS end_date        DATE,               -- optional hard end
  ADD COLUMN IF NOT EXISTS max_occurrences INTEGER;            -- optional occurrence cap

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS recurring_id UUID;                  -- → transaction_favourites.id

CREATE INDEX IF NOT EXISTS idx_transactions_recurring ON transactions(recurring_id);

-- Migrate existing monthly recurrences to the new model (monthly, no end).
UPDATE transaction_favourites
  SET recur_unit = 'month', recur_interval = 1,
      start_date = COALESCE(next_due_date, CURRENT_DATE)
  WHERE recurrence = 'monthly' AND recur_unit IS NULL;
