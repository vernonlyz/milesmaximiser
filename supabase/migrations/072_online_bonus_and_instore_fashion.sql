-- MCC eligibility: online-scoped bonus + any-channel inclusions.
--   card_library.bonus_channel  — if set (e.g. 'online'), the card's whitelist/
--       blacklist bonus applies only on that channel; other channels earn base.
--   card_mcc_eligibility.always_eligible — the MCC earns the bonus on ANY channel,
--       overriding bonus_channel (e.g. Citi Rewards in-store fashion).
ALTER TABLE card_library
  ADD COLUMN IF NOT EXISTS bonus_channel TEXT;
ALTER TABLE card_mcc_eligibility
  ADD COLUMN IF NOT EXISTS always_eligible BOOLEAN NOT NULL DEFAULT false;

-- DBS Woman's World (...002) and Citi Rewards (...017): 4 mpd bonus is online-only.
UPDATE card_library SET bonus_channel = 'online'
  WHERE id IN ('00000000-0000-0000-0001-000000000002', '00000000-0000-0000-0001-000000000017');

-- Citi Rewards: in-store fashion / department MCCs earn the bonus on ANY channel
-- (not just online). Added as always-eligible inclusions on the blacklist card.
DELETE FROM card_mcc_eligibility WHERE card_id = '00000000-0000-0000-0001-000000000017' AND always_eligible = true;
INSERT INTO card_mcc_eligibility (card_id, category_label, mcc_start, mcc_end, note, always_eligible) VALUES
  ('00000000-0000-0000-0001-000000000017', 'In-store fashion', '5311', '5311', 'Department stores', true),
  ('00000000-0000-0000-0001-000000000017', 'In-store fashion', '5611', '5611', NULL, true),
  ('00000000-0000-0000-0001-000000000017', 'In-store fashion', '5621', '5621', NULL, true),
  ('00000000-0000-0000-0001-000000000017', 'In-store fashion', '5631', '5631', NULL, true),
  ('00000000-0000-0000-0001-000000000017', 'In-store fashion', '5641', '5641', NULL, true),
  ('00000000-0000-0000-0001-000000000017', 'In-store fashion', '5651', '5651', NULL, true),
  ('00000000-0000-0000-0001-000000000017', 'In-store fashion', '5655', '5655', NULL, true),
  ('00000000-0000-0000-0001-000000000017', 'In-store fashion', '5661', '5661', NULL, true),
  ('00000000-0000-0000-0001-000000000017', 'In-store fashion', '5691', '5691', NULL, true),
  ('00000000-0000-0000-0001-000000000017', 'In-store fashion', '5699', '5699', NULL, true),
  ('00000000-0000-0000-0001-000000000017', 'In-store fashion', '5948', '5948', NULL, true);
