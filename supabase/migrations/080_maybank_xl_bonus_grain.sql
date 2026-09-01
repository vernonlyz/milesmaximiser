-- 080: Maybank XL Rewards — bonus rounding grain + credit timing (Reconcile).
--
-- XL Rewards earns TREATS Points on AGGREGATED eligible spend, not per charge:
--   sum all qualifying spend → ÷5 → round DOWN → × rate  (base ×5 / bonus ×45).
-- Flooring each transaction to $5 first (per_transaction) drops the sub-$5
-- remainder on every charge and under-credits, so the bonus must round aggregate.
-- Both base and bonus are credited together by the END of the following calendar
-- month, so defer the bonus lump (Reconcile dates it to end-of-next-month via
-- deferredCreditDate()).
--
-- Idempotent: plain UPDATE by id, safe to re-run.

UPDATE card_library
  SET bonus_rounding = 'aggregate',
      bonus_timing   = 'next_calendar_month'
  WHERE id = '00000000-0000-0000-0001-000000000016';  -- Maybank XL Rewards
