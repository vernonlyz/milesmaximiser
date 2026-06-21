-- Optional label describing what the miles goal is for (e.g. "SQ Suites to JFK").

ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS miles_goal_label TEXT;
