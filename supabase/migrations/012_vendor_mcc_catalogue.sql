-- MilesMaximiser — vendor catalogue and MCC catalogue (Phase 1)
--
-- Adds two admin-seeded reference tables:
--   mcc_catalogue     — ISO 18245 MCC codes with a suggested category
--   vendor_catalogue  — known SG merchants keyed to an MCC and category
--
-- Transactions gain vendor_name (free text from typeahead) and mcc (informational).
-- The recommendation engine continues to use category_id — MCC is metadata only.

-- ─────────────────────────────────────────────────────────────────────────────
-- MCC catalogue
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS mcc_catalogue (
  code                TEXT PRIMARY KEY,           -- 4-digit ISO code, e.g. '5814'
  description         TEXT NOT NULL,              -- human-readable label
  default_category_id UUID REFERENCES categories(id)  -- suggested app category
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Vendor catalogue (admin-seeded; users never write to this table)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS vendor_catalogue (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT NOT NULL UNIQUE,        -- canonical display name
  default_mcc         TEXT REFERENCES mcc_catalogue(code),
  default_category_id UUID REFERENCES categories(id),
  active              BOOLEAN NOT NULL DEFAULT TRUE
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Add vendor tracking fields to transactions
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS vendor_name TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS mcc         TEXT;

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS — catalogues are public read (same pattern as card_library)
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE mcc_catalogue    ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_catalogue ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'mcc_catalogue' AND policyname = 'public read mcc_catalogue'
  ) THEN
    CREATE POLICY "public read mcc_catalogue"
      ON mcc_catalogue FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'vendor_catalogue' AND policyname = 'public read vendor_catalogue'
  ) THEN
    CREATE POLICY "public read vendor_catalogue"
      ON vendor_catalogue FOR SELECT USING (true);
  END IF;
END $$;
