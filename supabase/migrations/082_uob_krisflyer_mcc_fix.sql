-- 082: UOB KrisFlyer Credit Card (id ...014) — MCC eligibility corrections.
--
-- Verified against MileLion's 12-Apr-2026 review:
--   • Online Shopping 5306 is NOT on the eligible list (and isn't a standard MCC;
--     the real duty-free/discount/department range 5309–5311 is already present) → drop.
--   • Transport BUS/MRT via SimplyGo (4111) was missing → add. 4121 is taxi/ride-hailing
--     only; its note wrongly implied SimplyGo bus/MRT qualifies under it → correct.
--   • Unlock threshold bumped S$800 → S$1,000 SIA-Group spend/year (display-only remark;
--     not enforced in the engine).
--
-- Idempotent: scoped deletes before the insert; remark rewritten in full.

DELETE FROM card_mcc_eligibility
  WHERE card_id = '00000000-0000-0000-0001-000000000014'
    AND category_label = 'Online Shopping' AND mcc_start = '5306';

DELETE FROM card_mcc_eligibility
  WHERE card_id = '00000000-0000-0000-0001-000000000014'
    AND category_label = 'Transport' AND mcc_start = '4111';
INSERT INTO card_mcc_eligibility (card_id, category_label, mcc_start, mcc_end, note) VALUES
  ('00000000-0000-0000-0001-000000000014', 'Transport', '4111', '4111', 'BUS/MRT via SimplyGo');

UPDATE card_mcc_eligibility
  SET note = 'Taxis / ride-hailing'
  WHERE card_id = '00000000-0000-0000-0001-000000000014'
    AND category_label = 'Transport' AND mcc_start = '4121';

UPDATE card_library
  SET remarks = ARRAY[
    'Miles credited directly to KrisFlyer — no bank points currency, no transfer needed',
    '3 mpd on Singapore Airlines, Scoot, KrisShop, Kris+ and Pelago',
    '2.4 mpd on dining, online shopping, online travel, transport (requires S$1,000 SIA Group spend/year to unlock)'
  ]
  WHERE id = '00000000-0000-0000-0001-000000000014';
