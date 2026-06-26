-- Migration: Optimize Auth RLS Initialization Plan
-- Fixes Supabase linter warning: auth_rls_initplan
-- Replaces auth.uid() with (select auth.uid()) to allow Postgres to cache
-- the value once per query (InitPlan) instead of evaluating it per-row.

-- =============================================
-- TABLE: cash_flow
-- =============================================
DROP POLICY IF EXISTS "Users can manage own cash flow" ON public.cash_flow;
CREATE POLICY "Users can manage own cash flow"
  ON public.cash_flow
  FOR ALL
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- =============================================
-- TABLE: bank_statements
-- =============================================
DROP POLICY IF EXISTS "Users can view own bank statements" ON public.bank_statements;
CREATE POLICY "Users can view own bank statements"
  ON public.bank_statements
  FOR SELECT
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own bank statements" ON public.bank_statements;
CREATE POLICY "Users can insert own bank statements"
  ON public.bank_statements
  FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own bank statements" ON public.bank_statements;
CREATE POLICY "Users can update own bank statements"
  ON public.bank_statements
  FOR UPDATE
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own bank statements" ON public.bank_statements;
CREATE POLICY "Users can delete own bank statements"
  ON public.bank_statements
  FOR DELETE
  USING ((select auth.uid()) = user_id);

-- =============================================
-- TABLE: bank_statement_items
-- =============================================
DROP POLICY IF EXISTS "Users can manage own bank statement items" ON public.bank_statement_items;
CREATE POLICY "Users can manage own bank statement items"
  ON public.bank_statement_items
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.bank_statements bs
      WHERE bs.id = bank_statement_items.statement_id
        AND bs.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bank_statements bs
      WHERE bs.id = bank_statement_items.statement_id
        AND bs.user_id = (select auth.uid())
    )
  );

-- =============================================
-- TABLE: receipts
-- =============================================
DROP POLICY IF EXISTS "Users can manage own receipts" ON public.receipts;
CREATE POLICY "Users can manage own receipts"
  ON public.receipts
  FOR ALL
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- =============================================
-- TABLE: receipts_items
-- =============================================
DROP POLICY IF EXISTS "Users can manage own receipt items" ON public.receipts_items;
CREATE POLICY "Users can manage own receipt items"
  ON public.receipts_items
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.receipts r
      WHERE r.id = receipts_items.receipt_id
        AND r.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.receipts r
      WHERE r.id = receipts_items.receipt_id
        AND r.user_id = (select auth.uid())
    )
  );
