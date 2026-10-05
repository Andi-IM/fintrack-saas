# ADR-084: Supabase Advisor Security and RLS Performance Hardening

## Status
Accepted

## Context
Following a diagnostic audit using the Supabase Advisor MCP tool (`get_advisors`), the database reported multiple security and performance advisories:
1. **Security Vulnerabilities**:
   - `function_search_path_mutable` (5 functions): Functions lacked an explicit `search_path`, leaving them susceptible to schema search path hijacking (CWE-426).
   - `anon_security_definer_function_executable` (6 functions): Functions running with `SECURITY DEFINER` (admin bypass) in `public` schema were executable by the unauthenticated `anon` role by default.
   - `verify_and_use_api_key`: The browser extension API key verification function was granted to `anon` and accessed via an unauthenticated fallback client (`createAnonClient`), exposing the RPC publicly.
2. **Performance Degradations**:
   - `auth_rls_initplan` (19 policies): RLS policies across `investment_accounts`, `investment_holdings`, `investment_transactions`, `api_keys`, and snapshot tables evaluated `auth.uid()` / `auth.role()` on each row instead of once per query.
   - `multiple_permissive_policies` (12 policies): Redundant `service_role` policies on `investment_price_snapshots` and `portfolio_snapshots` were exposed to `PUBLIC`, resulting in multiple permissive policies per role on `SELECT` queries.

## Decision
We implemented comprehensive hardening and optimization across database migrations and application code:
1. **Function Search Path Locking**:
   - Explicitly configured `SET search_path = public` (and `public, private` where appropriate) on `refresh_portfolio_snapshot`, `private.sync_cash_flow_transaction_time`, `update_updated_at_column`, `recalculate_holding_avg_price`, and `refresh_all_portfolio_snapshots`.
2. **Revocation of Anon Execution from Sensitive Functions**:
   - Executed `REVOKE EXECUTE ... FROM PUBLIC, anon` on all sensitive `SECURITY DEFINER` functions (`create_bank_statement_with_items`, `get_cash_flow_summary`, `get_financial_analytics`, `recalculate_holding_avg_price`, `refresh_portfolio_snapshot`).
   - Retained execution only for `authenticated` and `service_role`.
3. **API Key Verification Server-Side Hardening**:
   - Restricted `verify_and_use_api_key` execution exclusively to `service_role` (`REVOKE EXECUTE ... FROM PUBLIC, anon, authenticated`).
   - Updated `frontend/lib/auth/api-keys.ts` to execute verification via `createAdminClient()` (using the server-side service role key) rather than `createAnonClient()`. This eliminates the need to expose API key verification to unauthenticated callers.
4. **Row Level Security (RLS) Query Planner Optimization**:
   - Updated all user-scoped RLS policies to wrap function calls in subqueries: `user_id = (SELECT auth.uid())`. This instructs the PostgreSQL query planner to evaluate authentication once per query ($O(1)$) rather than per row ($O(N)$).
   - Restricted snapshot management policies explicitly `TO service_role` and simplified expressions to `USING (true)`, eliminating multiple permissive policies on public roles.
5. **Preservation of Core Indexes**:
   - Retained foreign key and filter indexes flagged under `unused_index` (`user_id`, `holding_id`, `transaction_time`) to maintain query performance as production data scales.

## Alternatives Considered
1. **Converting All Functions to `SECURITY INVOKER`**:
   - *Rejected*: Functions like `refresh_portfolio_snapshot` and `verify_and_use_api_key` require accessing cross-table aggregation snapshots and system keys that standard user permissions cannot access directly under RLS.
2. **Retaining `anon` Execution for `verify_and_use_api_key`**:
   - *Rejected*: Relying on `anon` exposed the function RPC endpoint to brute-force attempts from outside callers. Migrating fallback verification to `createAdminClient()` on the Next.js server eliminates the attack surface completely without impacting browser extension synchronization.

## Consequences
- **Positive**:
  - `function_search_path_mutable` warnings reduced to 0.
  - `anon_security_definer_function_executable` warnings reduced to 0.
  - `auth_rls_initplan` warnings reduced to 0 (19 policies resolved).
  - `multiple_permissive_policies` warnings reduced to 0 (12 policies resolved).
  - Browser extension synchronization remains fully operational and secure.
- **Trade-offs / Mitigations**:
  - FinTrack MCP server must be provided with `SUPABASE_SERVICE_ROLE_KEY` to run administrative RPC aggregations, consistent with existing documentation.

## Related Notes
- [083-api-key-authentication-for-extension-sync.md](file:///d:/01_Projects/fintrack-saas/docs/decisions/083-api-key-authentication-for-extension-sync.md)
- [20261005080000_harden_security_and_optimize_rls.sql](file:///d:/01_Projects/fintrack-saas/supabase/migrations/20261005080000_harden_security_and_optimize_rls.sql)
- [api-keys.ts](file:///d:/01_Projects/fintrack-saas/frontend/lib/auth/api-keys.ts)
- [api-keys.test.ts](file:///d:/01_Projects/fintrack-saas/frontend/lib/auth/__tests__/api-keys.test.ts)
