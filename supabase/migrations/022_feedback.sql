-- Migration 022: feedback table for bug reports and suggestions

CREATE TABLE IF NOT EXISTS feedback (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email  TEXT,
  type        TEXT NOT NULL CHECK (type IN ('bug', 'suggestion')),
  message     TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can submit their own feedback
CREATE POLICY "users can insert feedback"
  ON feedback FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Only admin can read all feedback
CREATE POLICY "admin can read feedback"
  ON feedback FOR SELECT
  TO authenticated
  USING (auth.email() = 'vernonlyz@gmail.com');

-- Only admin can update status
CREATE POLICY "admin can update feedback"
  ON feedback FOR UPDATE
  TO authenticated
  USING  (auth.email() = 'vernonlyz@gmail.com')
  WITH CHECK (auth.email() = 'vernonlyz@gmail.com');
