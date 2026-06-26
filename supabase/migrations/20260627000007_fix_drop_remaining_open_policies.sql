-- Fix: Drop remaining open DELETE policies that were missed in migration 20260627000002.
-- These policies allow any client to delete any row regardless of ownership,
-- bypassing the user-scoped RLS we implemented.
-- The correct DELETE policies are already in place via the user-scoped policies.

DROP POLICY IF EXISTS "Enable delete access for all users" ON public.bank_statements;
DROP POLICY IF EXISTS "Enable delete access for all users" ON public.bank_statement_items;
