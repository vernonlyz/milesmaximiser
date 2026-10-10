-- 086: Add MCC 3075 (Singapore Airlines) to the catalogue, mapped to Travel (006).
--
-- 3075 is SIA's carrier-specific airline MCC. Adding it to mcc_catalogue makes it
-- resolvable in the MCC lookup/typeahead and auto-categorises SIA spend as Travel.
-- (It already falls inside UOB KrisFlyer's 3000-3350 "Air Tickets" tier → 3 mpd.)
-- Idempotent.

INSERT INTO mcc_catalogue (code, description, default_category_id) VALUES
  ('3075', 'Singapore Airlines', '00000000-0000-0000-0000-000000000006')
ON CONFLICT (code) DO NOTHING;
