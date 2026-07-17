-- Cards that credit the full earned miles per transaction with no separate bonus
-- (e.g. UOB KrisFlyer Visa credits KrisFlyer miles directly — no UNI$, no
-- accumulated bonus lump). For reconciliation these show the whole earned amount
-- under "base" and emit no bonus lumps.

ALTER TABLE card_library
  ADD COLUMN IF NOT EXISTS no_bonus_split BOOLEAN NOT NULL DEFAULT false;

UPDATE card_library
  SET no_bonus_split = true
  WHERE bank = 'UOB' AND name = 'KrisFlyer Visa';
