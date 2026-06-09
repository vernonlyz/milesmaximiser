-- Migration 020: Add earn_increment to card_library
-- Most SG banks award miles per $5 block (rounded down to nearest $5).
-- HSBC and Citibank round down to the nearest $1 instead.

ALTER TABLE card_library
  ADD COLUMN earn_increment INTEGER NOT NULL DEFAULT 5;

UPDATE card_library
SET earn_increment = 1
WHERE bank IN ('HSBC', 'Citibank');
