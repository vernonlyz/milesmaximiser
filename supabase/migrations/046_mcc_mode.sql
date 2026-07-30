-- MCC eligibility model per card:
--   whitelist  → only the listed MCCs are bonus-eligible; anything else is not.
--   blacklist  → everything is eligible EXCEPT the listed MCCs.
--   NULL       → not modelled (no eligibility data).
-- The card_mcc_eligibility rows are interpreted per this mode.

ALTER TABLE card_library
  ADD COLUMN IF NOT EXISTS mcc_mode TEXT;   -- 'whitelist' | 'blacklist'

UPDATE card_library SET mcc_mode = 'whitelist'
  WHERE (bank = 'HSBC' AND name = 'Revolution')
     OR (bank = 'UOB'  AND name = 'Lady''s Solitaire Card');
