-- Add general spend categories (base rate only — no card bonus rates).
INSERT INTO categories (id, name, icon) VALUES
  ('00000000-0000-0000-0000-000000000013', 'Insurance',    '🛡️'),
  ('00000000-0000-0000-0000-000000000014', 'Subscription', '📺'),
  ('00000000-0000-0000-0000-000000000015', 'Health',       '🩺')
ON CONFLICT (id) DO NOTHING;
