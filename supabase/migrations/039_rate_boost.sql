-- Per-user rate boost (e.g. UOB Lady's Solitaire + Lady's Savings Account → 6 mpd).
--
-- A card may define an optional boost (boost_mpd) unlocked by holding a linked
-- product. The user toggles it per card (user_card_selections.rate_boost); when on,
-- the card's bonus-category rate is raised to boost_mpd. Caps are unchanged.

ALTER TABLE card_library
  ADD COLUMN IF NOT EXISTS boost_mpd   NUMERIC,
  ADD COLUMN IF NOT EXISTS boost_label TEXT;

ALTER TABLE user_card_selections
  ADD COLUMN IF NOT EXISTS rate_boost BOOLEAN NOT NULL DEFAULT false;

-- UOB Lady's Solitaire: 6 mpd on chosen categories with a UOB Lady's Savings Account.
UPDATE card_library
  SET boost_mpd = 6, boost_label = 'UOB Lady''s Savings Account'
  WHERE bank = 'UOB' AND name = 'Lady''s Solitaire Card';
