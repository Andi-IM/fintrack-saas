-- ==============================================================================
-- Migration: Harden Security Definer Functions & Optimize RLS Policies
-- Description:
--   1. Set immutable search_path on mutable functions (CWE-426 / privilege escalation prevention).
--   2. Revoke public/anon execute privileges on sensitive SECURITY DEFINER RPC functions.
--   3. Optimize RLS policies across investment and api_keys tables using (SELECT auth.uid()).
--   4. Restrict service_role snapshot management policies exclusively TO service_role
--      to eliminate multiple permissive policy warnings on public roles.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Function search_path Hardening
-- ------------------------------------------------------------------------------
ALTER FUNCTION public.refresh_portfolio_snapshot(UUID) SET search_path = public;
ALTER FUNCTION private.sync_cash_flow_transaction_time() SET search_path = public, private;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
ALTER FUNCTION public.recalculate_holding_avg_price(UUID) SET search_path = public;
ALTER FUNCTION public.refresh_all_portfolio_snapshots() SET search_path = public;

-- ------------------------------------------------------------------------------
-- 2. Revoke Anon / Public Execution on SECURITY DEFINER Functions
-- ------------------------------------------------------------------------------
-- create_bank_statement_with_items
REVOKE EXECUTE ON FUNCTION public.create_bank_statement_with_items(UUID, TEXT, DATE, NUMERIC, NUMERIC, INT, TEXT, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_bank_statement_with_items(UUID, TEXT, DATE, NUMERIC, NUMERIC, INT, TEXT, JSONB) TO authenticated, service_role;

-- get_cash_flow_summary
REVOKE EXECUTE ON FUNCTION public.get_cash_flow_summary(UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_cash_flow_summary(UUID, TEXT, TEXT) TO authenticated, service_role;

-- get_financial_analytics
REVOKE EXECUTE ON FUNCTION public.get_financial_analytics(UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_financial_analytics(UUID, TEXT, TEXT) TO authenticated, service_role;

-- recalculate_holding_avg_price
REVOKE EXECUTE ON FUNCTION public.recalculate_holding_avg_price(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.recalculate_holding_avg_price(UUID) TO authenticated, service_role;

-- refresh_portfolio_snapshot
REVOKE EXECUTE ON FUNCTION public.refresh_portfolio_snapshot(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.refresh_portfolio_snapshot(UUID) TO authenticated, service_role;

-- verify_and_use_api_key (only service_role on server backend should execute this)
REVOKE EXECUTE ON FUNCTION public.verify_and_use_api_key(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_and_use_api_key(TEXT, TEXT) TO service_role;

-- ------------------------------------------------------------------------------
-- 3. Optimize Investment Tables RLS Policies (auth.uid() -> (SELECT auth.uid()))
-- ------------------------------------------------------------------------------
-- investment_accounts
ALTER POLICY "Users can view own investment accounts" ON public.investment_accounts USING (user_id = (SELECT auth.uid()));
ALTER POLICY "Users can insert own investment accounts" ON public.investment_accounts WITH CHECK (user_id = (SELECT auth.uid()));
ALTER POLICY "Users can update own investment accounts" ON public.investment_accounts USING (user_id = (SELECT auth.uid()));
ALTER POLICY "Users can delete own investment accounts" ON public.investment_accounts USING (user_id = (SELECT auth.uid()));

-- investment_holdings
ALTER POLICY "Users can view own holdings" ON public.investment_holdings USING (user_id = (SELECT auth.uid()));
ALTER POLICY "Users can insert own holdings" ON public.investment_holdings WITH CHECK (user_id = (SELECT auth.uid()));
ALTER POLICY "Users can update own holdings" ON public.investment_holdings USING (user_id = (SELECT auth.uid()));
ALTER POLICY "Users can delete own holdings" ON public.investment_holdings USING (user_id = (SELECT auth.uid()));

-- investment_transactions
ALTER POLICY "Users can view own transactions" ON public.investment_transactions USING (user_id = (SELECT auth.uid()));
ALTER POLICY "Users can insert own transactions" ON public.investment_transactions WITH CHECK (user_id = (SELECT auth.uid()));
ALTER POLICY "Users can update own transactions" ON public.investment_transactions USING (user_id = (SELECT auth.uid()));
ALTER POLICY "Users can delete own transactions" ON public.investment_transactions USING (user_id = (SELECT auth.uid()));

-- ------------------------------------------------------------------------------
-- 4. Clean up Multiple Permissive Policies & Initplan on Snapshots
-- ------------------------------------------------------------------------------
ALTER POLICY "Users can view own portfolio snapshots" ON public.portfolio_snapshots USING (user_id = (SELECT auth.uid()));
ALTER POLICY "Service role can manage portfolio snapshots" ON public.portfolio_snapshots TO service_role USING (true);
ALTER POLICY "Service role can manage price snapshots" ON public.investment_price_snapshots TO service_role USING (true);

-- ------------------------------------------------------------------------------
-- 5. Optimize api_keys RLS Policies
-- ------------------------------------------------------------------------------
ALTER POLICY "Users can view own api keys" ON public.api_keys USING (user_id = (SELECT auth.uid()));
ALTER POLICY "Users can insert own api keys" ON public.api_keys WITH CHECK (user_id = (SELECT auth.uid()));
ALTER POLICY "Users can update own api keys" ON public.api_keys USING (user_id = (SELECT auth.uid()));
ALTER POLICY "Users can delete own api keys" ON public.api_keys USING (user_id = (SELECT auth.uid()));
