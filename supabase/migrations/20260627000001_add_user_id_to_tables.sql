-- Migration: Add user_id column to all root tables
-- This links each row to the Supabase Auth user who owns it.
-- Column is nullable first (to allow backfill), then set to NOT NULL after backfill.

-- cash_flow
ALTER TABLE public.cash_flow
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- bank_statements
ALTER TABLE public.bank_statements
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- receipts
ALTER TABLE public.receipts
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add indexes for RLS policy performance
CREATE INDEX IF NOT EXISTS idx_cash_flow_user_id ON public.cash_flow(user_id);
CREATE INDEX IF NOT EXISTS idx_bank_statements_user_id ON public.bank_statements(user_id);
CREATE INDEX IF NOT EXISTS idx_receipts_user_id ON public.receipts(user_id);
