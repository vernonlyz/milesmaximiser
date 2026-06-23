-- Recurring charges: extend saved favourites with an optional monthly schedule.
-- recurrence = 'monthly' makes a favourite recur; next_due_date is the next occurrence.
-- Pending occurrences are surfaced on the Dashboard for the user to confirm.

ALTER TABLE transaction_favourites
  ADD COLUMN IF NOT EXISTS recurrence    TEXT,     -- 'monthly' | null
  ADD COLUMN IF NOT EXISTS recur_day     INTEGER,  -- day of month, 1-28
  ADD COLUMN IF NOT EXISTS next_due_date DATE;
