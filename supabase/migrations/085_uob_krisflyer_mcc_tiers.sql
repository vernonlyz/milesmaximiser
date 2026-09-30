-- 085: UOB KrisFlyer (id ...014) — per-MCC-tier rates so SIA/airlines earn 3 mpd and
-- the everyday whitelist categories earn 2.4 (not the card's max 3.0).
--
-- Bugs fixed:
--   • 4511 (Singapore Airlines) was NOT whitelisted → the gate demoted SIA to base 1.2.
--   • The only bonus rate row was Travel 3.0, so the binary gate promoted EVERY whitelisted
--     MCC (dining/online/transport) to 3.0 instead of 2.4.
--
-- Uses card_mcc_eligibility.bonus_mpd (migration 083). Note: UOB's 3 mpd is by SIA-Group
-- MERCHANT, not MCC, so keying on airline MCCs also credits non-SIA airlines at 3.0, and
-- KrisShop/Kris+/Pelago (non-airline MCCs) aren't auto-captured — an accepted approximation.
-- Idempotent.

-- Airlines / SIA Group → 3 mpd (new whitelist tier).
DELETE FROM card_mcc_eligibility WHERE card_id = '00000000-0000-0000-0001-000000000014' AND category_label = 'Air Tickets';
INSERT INTO card_mcc_eligibility (card_id, category_label, mcc_start, mcc_end, note, bonus_mpd) VALUES
  ('00000000-0000-0000-0001-000000000014', 'Air Tickets', '3000', '3350', 'Airlines / SIA Group', 3.0),
  ('00000000-0000-0000-0001-000000000014', 'Air Tickets', '4511', '4511', 'Air carriers', 3.0);

-- Everyday whitelist categories → 2.4 (were wrongly promoted to the max 3.0).
UPDATE card_mcc_eligibility SET bonus_mpd = 2.4
  WHERE card_id = '00000000-0000-0000-0001-000000000014'
    AND category_label IN ('Dining', 'Online Shopping', 'Transport');

-- No-MCC fallback rates: 2.4 for dining/online-shopping/transport (Travel 3.0 unchanged).
DELETE FROM library_rates WHERE card_id = '00000000-0000-0000-0001-000000000014'
  AND category_id IN (
    '00000000-0000-0000-0000-000000000001',  -- Dining
    '00000000-0000-0000-0000-000000000004',  -- Online Shopping
    '00000000-0000-0000-0000-000000000008')  -- Transport
  AND effective_from = '2000-01-01';
INSERT INTO library_rates (card_id, category_id, mpd, effective_from) VALUES
  ('00000000-0000-0000-0001-000000000014','00000000-0000-0000-0000-000000000001', 2.4, '2000-01-01'),
  ('00000000-0000-0000-0001-000000000014','00000000-0000-0000-0000-000000000004', 2.4, '2000-01-01'),
  ('00000000-0000-0000-0001-000000000014','00000000-0000-0000-0000-000000000008', 2.4, '2000-01-01');
