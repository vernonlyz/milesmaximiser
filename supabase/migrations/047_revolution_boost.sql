-- HSBC Revolution: 8 mpd on bonus categories when paired with an HSBC Everyday
-- Global Account. Reuses the existing rate-boost machinery (boost_mpd + the
-- effective-dated user_card_boosts toggle); Revolution's bonus is modelled as
-- category rates, so applyRateBoosts raises them from 4 → 8 mpd when enabled.
UPDATE card_library
  SET boost_mpd = 8, boost_label = 'HSBC Everyday Global Account'
  WHERE bank = 'HSBC' AND name = 'Revolution';
