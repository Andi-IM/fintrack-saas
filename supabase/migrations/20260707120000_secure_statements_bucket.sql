-- Migration: Secure the Supabase Storage bucket for statements.
-- Changes:
--   1. Remove open policies (TO public) that allow anonymous read/write/delete.
--   2. Add user-scoped policies: each user can only access files under their own user_id folder.
--
-- New required file path convention: statements/<user_id>/<filename>
-- (e.g., statements/550e8400-e29b-41d4-a716-446655440000/statement_001.pdf)
--
-- NOTE: The frontend upload path must be updated to use this convention.

-- 1. Remove old, highly permissive open policies
DROP POLICY IF EXISTS "Allow uploads to statements bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow reads from statements bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow deletes from statements bucket" ON storage.objects;

-- 2. INSERT: authenticated users may upload only under their own user_id folder
DROP POLICY IF EXISTS "Users can upload own statements" ON storage.objects;
CREATE POLICY "Users can upload own statements"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'statements'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 3. SELECT: authenticated users may read only their own files
DROP POLICY IF EXISTS "Users can view own statements" ON storage.objects;
CREATE POLICY "Users can view own statements"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'statements'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 4. UPDATE: authenticated users may replace only their own files
DROP POLICY IF EXISTS "Users can update own statements" ON storage.objects;
CREATE POLICY "Users can update own statements"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'statements'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'statements'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 5. DELETE: authenticated users may delete only their own files
DROP POLICY IF EXISTS "Users can delete own statements" ON storage.objects;
CREATE POLICY "Users can delete own statements"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'statements'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
