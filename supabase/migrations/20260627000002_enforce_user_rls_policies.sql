-- Migration: Replace open "USING (true)" policies with user-scoped RLS policies.
-- Every user may only read/write their own data.

-- =============================================
-- TABLE: cash_flow
-- =============================================
DROP POLICY IF EXISTS "Allow public access" ON public.cash_flow;

-- Single ALL policy: covers SELECT, INSERT, UPDATE, DELETE
CREATE POLICY "Users can manage own cash flow"
  ON public.cash_flow
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =============================================
-- TABLE: bank_statements
-- =============================================
DROP POLICY IF EXISTS "Enable read access for all users" ON public.bank_statements;
DROP POLICY IF EXISTS "Enable insert access for all users" ON public.bank_statements;

-- Granular policies: SELECT and DELETE use USING; INSERT uses WITH CHECK; UPDATE uses both.
CREATE POLICY "Users can view own bank statements"
  ON public.bank_statements
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bank statements"
  ON public.bank_statements
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bank statements"
  ON public.bank_statements
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own bank statements"
  ON public.bank_statements
  FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================
-- TABLE: bank_statement_items (child table)
-- Access is derived from parent bank_statements ownership.
-- No user_id column on this table — security is inherited via subquery.
-- =============================================
DROP POLICY IF EXISTS "Enable read access for all users" ON public.bank_statement_items;
DROP POLICY IF EXISTS "Enable insert access for all users" ON public.bank_statement_items;
DROP POLICY IF EXISTS "Enable update access for all users" ON public.bank_statement_items;

CREATE POLICY "Users can manage own bank statement items"
  ON public.bank_statement_items
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.bank_statements bs
      WHERE bs.id = bank_statement_items.statement_id
        AND bs.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bank_statements bs
      WHERE bs.id = bank_statement_items.statement_id
        AND bs.user_id = auth.uid()
    )
  );

-- =============================================
-- TABLE: receipts
-- =============================================
DROP POLICY IF EXISTS "Allow public access" ON public.receipts;

CREATE POLICY "Users can manage own receipts"
  ON public.receipts
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =============================================
-- TABLE: receipts_items (child table)
-- Access is derived from parent receipts ownership.
-- =============================================
DROP POLICY IF EXISTS "Allow public access" ON public.receipts_items;

CREATE POLICY "Users can manage own receipt items"
  ON public.receipts_items
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.receipts r
      WHERE r.id = receipts_items.receipt_id
        AND r.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.receipts r
      WHERE r.id = receipts_items.receipt_id
        AND r.user_id = auth.uid()
    )
  );
