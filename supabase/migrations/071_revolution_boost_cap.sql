-- HSBC Revolution: pairing with an HSBC Everyday Global Account raises not only
-- the rate (4 → 8 mpd, migration 047) but also the monthly bonus cap from
-- S$1,000 to S$1,200. Modelled with a new boost_cap column, applied when the
-- boost is active (applyCapBoosts, mirroring the rate boost).
ALTER TABLE card_library
  ADD COLUMN IF NOT EXISTS boost_cap NUMERIC;

UPDATE card_library SET boost_cap = 1200
  WHERE bank = 'HSBC' AND name = 'Revolution';
