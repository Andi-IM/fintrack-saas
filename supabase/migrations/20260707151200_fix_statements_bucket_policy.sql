-- Migration: Fix Supabase Storage bucket policies for backward compatibility.
-- Old files were uploaded without the user_id in the folder path.
-- The previous policy strictly checked if the first folder was the user_id, 
-- which caused 404 "Object not found" for older files.
-- This update allows access if the first folder is user_id OR if the file belongs to the user via the owner column OR if it's linked to their bank_statements record.

DROP POLICY IF EXISTS "Users can view own statements" ON storage.objects;
CREATE POLICY "Users can view own statements"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'statements'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR owner = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.bank_statements bs 
        WHERE bs.file_path = name AND bs.user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can delete own statements" ON storage.objects;
CREATE POLICY "Users can delete own statements"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'statements'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR owner = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.bank_statements bs 
        WHERE bs.file_path = name AND bs.user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can update own statements" ON storage.objects;
CREATE POLICY "Users can update own statements"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'statements'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR owner = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.bank_statements bs 
        WHERE bs.file_path = name AND bs.user_id = auth.uid()
      )
    )
  );
