-- Let the admin manage the shared vendor_catalogue from the app (Admin → Vendors).
-- Public read already exists (migration 012); add admin-only write policies using
-- the same auth.email() pattern as feedback (migration 022).
DROP POLICY IF EXISTS "admin insert vendor_catalogue" ON vendor_catalogue;
CREATE POLICY "admin insert vendor_catalogue" ON vendor_catalogue
  FOR INSERT WITH CHECK (auth.email() = 'vernonlyz@gmail.com');

DROP POLICY IF EXISTS "admin update vendor_catalogue" ON vendor_catalogue;
CREATE POLICY "admin update vendor_catalogue" ON vendor_catalogue
  FOR UPDATE USING (auth.email() = 'vernonlyz@gmail.com')
  WITH CHECK (auth.email() = 'vernonlyz@gmail.com');

DROP POLICY IF EXISTS "admin delete vendor_catalogue" ON vendor_catalogue;
CREATE POLICY "admin delete vendor_catalogue" ON vendor_catalogue
  FOR DELETE USING (auth.email() = 'vernonlyz@gmail.com');
