-- MilesMaximiser — per-transaction manual MPD override
-- Lets users record the actual miles rate when a bank promotion or campaign
-- applies outside the library's configured rates (e.g. 5x Grab weekend promo).
--
-- computed_mpd: what the engine calculated at save time (always stored going forward)
-- manual_mpd:   user's override; NULL = no override, use computed_mpd
-- override_note: free-text reason (e.g. "5× Grab weekend promo")
--
-- effective_mpd remains the final applied value: COALESCE(manual_mpd, computed_mpd)
-- Existing rows get NULL for all three columns (pre-feature transactions).

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS computed_mpd  NUMERIC;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS manual_mpd    NUMERIC;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS override_note TEXT;
