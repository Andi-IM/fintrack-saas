-- Migration: Secure the Supabase Storage bucket for receipts.
-- Changes:
--   1. Make the bucket private (public = false) — files are no longer publicly accessible by URL.
--   2. Remove open policies (TO public).
--   3. Add user-scoped policies: each user can only access files under their own user_id folder.
--
-- New required file path convention: receipts/<user_id>/<filename>
-- (e.g., receipts/550e8400-e29b-41d4-a716-446655440000/receipt_001.jpg)
--
-- NOTE: The frontend upload path must be updated to use this convention.
--       Existing files in storage without a user_id prefix will be inaccessible
--       until manually moved or a one-time migration script is run via Supabase Dashboard.

-- 1. Make bucket private
UPDATE storage.buckets
SET public = false
WHERE id = 'receipts';

-- 2. Remove old open policies
DROP POLICY IF EXISTS "Allow uploads to receipts bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow reads from receipts bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow deletes from receipts bucket" ON storage.objects;

-- 3. INSERT: authenticated users may upload only under their own user_id folder
CREATE POLICY "Authenticated users can upload own receipts"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'receipts'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 4. SELECT: authenticated users may read only their own files
--    (Used to generate signed URLs via supabase.storage.from('receipts').createSignedUrl())
CREATE POLICY "Users can view own receipt files"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'receipts'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 5. UPDATE: authenticated users may replace only their own files
--    (Required for upsert operations: INSERT + SELECT + UPDATE)
CREATE POLICY "Users can update own receipt files"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'receipts'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'receipts'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 6. DELETE: authenticated users may delete only their own files
CREATE POLICY "Users can delete own receipt files"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'receipts'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
