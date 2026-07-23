-- Prevent path-hijacking attacks against the legacy receipt storage policy.
--
-- The SELECT policy on storage.objects grants access to any object whose path
-- appears in public.receipts.file_path for a row the caller owns.  Without a
-- write guard, an authenticated user could UPDATE their own receipt row to point
-- file_path at another user's storage object and thereby gain read access to it.
--
-- This migration replaces the broad FOR ALL policy with separate INSERT/SELECT
-- and UPDATE policies.  The UPDATE policy adds a WITH CHECK that forces
-- file_path to remain NULL or to start with the calling user's UID, closing the
-- path-hijacking window.

-- Drop the existing combined policy
DROP POLICY IF EXISTS "Users can manage own receipts" ON public.receipts;

-- SELECT / DELETE: row must be owned by the caller (no path constraint needed)
CREATE POLICY "Users can select own receipts"
  ON public.receipts
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own receipts"
  ON public.receipts
  FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- INSERT: row ownership enforced; file_path must be null or user-scoped
CREATE POLICY "Users can insert own receipts"
  ON public.receipts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (select auth.uid()) = user_id
    AND (
      file_path IS NULL
      OR file_path LIKE ((select auth.uid())::text || '/%')
    )
  );

-- UPDATE: row ownership enforced; file_path must remain null or user-scoped
-- This prevents a user from repointing file_path to another user's storage object.
CREATE POLICY "Users can update own receipts"
  ON public.receipts
  FOR UPDATE
  TO authenticated
  USING  ((select auth.uid()) = user_id)
  WITH CHECK (
    (select auth.uid()) = user_id
    AND (
      file_path IS NULL
      OR file_path LIKE ((select auth.uid())::text || '/%')
    )
  );
