-- Correct the Maybank TREATS Points conversion: 1 TREATS Point = 0.4 miles
-- (2.5 pts per mile), not the indicative 0.2 seeded in migration 035. This makes
-- the reward-point multipliers resolve correctly for Maybank XL Rewards —
-- base 0.4 mpd = 1X, bonus 3.6 mpd = 9X (4 mpd / 10X total on bonus categories).
-- Idempotent (keyed on the program name).

UPDATE reward_programs
   SET miles_per_point = 0.4,
       notes = '1 TREATS Point ≈ 0.4 miles (2.5 pts per mile). XL Rewards: 1X base / 9X bonus.'
 WHERE name = 'Maybank TREATS Points';
