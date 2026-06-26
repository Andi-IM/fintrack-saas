-- Fix: Ensure EXECUTE is revoked from PUBLIC for rls_auto_enable
-- In PostgreSQL, functions are granted EXECUTE to PUBLIC by default.
-- Revoking from anon and authenticated is sometimes not enough if they
-- inherit it from PUBLIC.
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon, authenticated;

-- For good measure, we can also explicitly alter the search_path
-- of the private functions just in case the CREATE OR REPLACE syntax
-- didn't register correctly with the linter's specific regex/parser.
ALTER FUNCTION private.set_user_id() SET search_path = '';
ALTER FUNCTION private.sync_bank_statement_item_to_cash_flow() SET search_path = '';
