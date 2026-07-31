-- Add MariBank Mari Credit Card — 1.5% cashback, uncapped, no minimum spend.
INSERT INTO card_library
  (id, name, bank, card_network, base_mpd, color, mile_validity, remarks, cap_cycle, earn_increment, card_type, cashback_rate)
VALUES
  ('00000000-0000-0000-0001-000000000024', 'Mari Credit Card', 'MariBank', 'Mastercard', 0, '#00B3A4', NULL,
     ARRAY['1.5% cashback on all spend, uncapped, no minimum spend'], 'calendar', 1, 'cashback', 0.015)
ON CONFLICT (id) DO NOTHING;
