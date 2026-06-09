-- Migration 019: Set cap_cycle to 'calendar' for all cards except Citi Rewards
--
-- Most SG cards cap bonus spend by calendar month. Citi Rewards Mastercard
-- is the exception — it resets by statement cycle.

UPDATE card_library SET cap_cycle = 'calendar';

UPDATE card_library SET cap_cycle = 'statement'
WHERE id = '00000000-0000-0000-0001-000000000017';  -- Citi Rewards Mastercard
