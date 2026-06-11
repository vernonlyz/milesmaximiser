-- Add personal_amount to transactions for group-spend splitting.
-- When null, the full amount is the user's own expense.
-- Miles and cashback are always earned on the full amount column.

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS personal_amount NUMERIC;
