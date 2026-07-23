-- Allow authenticated users to read receipt files they own through either:
-- 1. the current user-scoped storage path convention, or
-- 2. a legacy storage object path referenced by an owned public.receipts row.
--
-- Upload/update/delete remain restricted to user-scoped folders.

DROP POLICY IF EXISTS "Users can view own receipt files" ON storage.objects;

CREATE POLICY "Users can view own receipt files"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'receipts'
    AND (
      (storage.foldername(name))[1] = ((select auth.uid()))::text
      OR EXISTS (
        SELECT 1
        FROM public.receipts r
        WHERE r.file_path = storage.objects.name
          AND r.user_id = (select auth.uid())
      )
    )
  );
