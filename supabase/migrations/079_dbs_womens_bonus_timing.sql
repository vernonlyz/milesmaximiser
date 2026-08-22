-- DBS Woman's World Card credits its accumulated calendar-month bonus on the
-- 15th of the FOLLOWING month (not at cycle close). Mark it as deferred so the
-- Reconcile page schedules the bonus lump into next month; the exact 15th-of-month
-- credit date is applied in the UI (deferredCreditDate). Idempotent.

UPDATE card_library
   SET bonus_timing = 'next_calendar_month'
 WHERE bank = 'DBS' AND name = 'Woman''s World Card';
