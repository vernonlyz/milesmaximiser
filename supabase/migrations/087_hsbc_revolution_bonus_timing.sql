-- 087: HSBC Revolution (id ...015) — bonus credits at the END of the following
-- calendar month, not on-post. Set bonus_timing so the Reconcile page dates the
-- accumulated bonus lump to next-month-end (base still posts per transaction).
-- deferredCreditDate() special-cases HSBC Revolution to the last day of next month.
-- Idempotent.

UPDATE card_library SET bonus_timing = 'next_calendar_month'
  WHERE id = '00000000-0000-0000-0001-000000000015';
