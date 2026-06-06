-- MilesMaximiser — add per-user auth
-- Run this AFTER 001_initial_schema.sql in the Supabase SQL editor.
-- WARNING: This truncates credit_cards, card_rates, spending_caps, and transactions.
-- Categories are kept (they are shared lookup data).
-- After running this, use the "Import Starter Cards" button in the app to re-add SG cards.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Clear existing data (seed cards had no user_id)
-- ─────────────────────────────────────────────────────────────────────────────
TRUNCATE transactions, spending_caps, card_rates, credit_cards RESTART IDENTITY CASCADE;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Add user_id columns
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE credit_cards ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE transactions  ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX idx_credit_cards_user ON credit_cards(user_id);
CREATE INDEX idx_transactions_user  ON transactions(user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Drop old public-access policies
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "public_all" ON categories;
DROP POLICY IF EXISTS "public_all" ON credit_cards;
DROP POLICY IF EXISTS "public_all" ON card_rates;
DROP POLICY IF EXISTS "public_all" ON spending_caps;
DROP POLICY IF EXISTS "public_all" ON transactions;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. New per-user RLS policies
-- ─────────────────────────────────────────────────────────────────────────────

-- Categories: shared lookup — any authenticated user can read, nobody can write
CREATE POLICY "auth_read" ON categories
  FOR SELECT TO authenticated USING (true);

-- credit_cards: user owns their own rows
CREATE POLICY "user_own" ON credit_cards FOR ALL TO authenticated
  USING     (user_id = auth.uid())
  WITH CHECK(user_id = auth.uid());

-- card_rates: accessible when the parent card belongs to the user
CREATE POLICY "user_own" ON card_rates FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM credit_cards c WHERE c.id = card_rates.card_id AND c.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM credit_cards c WHERE c.id = card_rates.card_id AND c.user_id = auth.uid())
  );

-- spending_caps: same pattern as card_rates
CREATE POLICY "user_own" ON spending_caps FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM credit_cards c WHERE c.id = spending_caps.card_id AND c.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM credit_cards c WHERE c.id = spending_caps.card_id AND c.user_id = auth.uid())
  );

-- transactions: user owns their own rows
CREATE POLICY "user_own" ON transactions FOR ALL TO authenticated
  USING     (user_id = auth.uid())
  WITH CHECK(user_id = auth.uid());
