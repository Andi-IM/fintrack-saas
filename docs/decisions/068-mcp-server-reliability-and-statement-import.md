# ADR-068: MCP Server Reliability, SQL Aggregation, and Bank Statement Import

## Status
Accepted

## Context
When running the FinTrack Model Context Protocol (MCP) server with external agents (such as Hermes Agent via Podman/Docker stdio authenticated with `SUPABASE_SERVICE_ROLE_KEY` and `FINTRACK_USER_ID`), four critical operational issues and diagnosis hurdles were identified:

1. **PostgREST 1,000-Row Truncation in Cash Flow Aggregations**:
   The tools `get_cash_flow_summary` and `get_financial_analytics` previously fetched records via a basic PostgREST `.select()` and accumulated totals in Node.js memory. Because Supabase PostgREST defaults to a maximum limit of 1,000 rows (`max_rows = 1000`), users with more than 1,000 transactions (e.g., 1,213 transactions) had their summaries silently truncated at 1,000 records, producing inaccurate financial reports without any warning.

2. **Silent Zero Returns on Authentication or Query Failures**:
   When `SUPABASE_SERVICE_ROLE_KEY` was missing or populated with a public `anon` key, the server previously fell back to the anon key. Under Row-Level Security (RLS), unauthenticated queries to `cash_flow` returned HTTP 200 with an empty array `[]` and `null` error. The MCP server treated this as valid data and returned `{ success: true, totalIncome: 0, totalExpense: 0 }`, causing severe diagnosis confusion and obscuring configuration defects.

3. **Service Role Blocker on Bank Statement Item Sync**:
   The database trigger `private.sync_bank_statement_item_to_cash_flow()` previously inserted into `public.cash_flow` without providing `user_id`. The subsequent trigger `private.set_user_id()` fell back to `auth.uid()`, which is `NULL` when executing under `service_role` tokens. This threw `RAISE EXCEPTION 'user_id cannot be null'`, completely blocking external agents and background jobs from importing bank statement items.

4. **Missing Tool for Direct Bank Statement Import**:
   Statement tools were read-only (`list_bank_statements` and `get_statement_mutations`), requiring the Next.js frontend UI to parse and upload statements. External agents could not programmatically import statements or mutation records.

Additionally, handling base64 uploads in `create_receipt` required hardening to prevent unhandled filesystem path lookups in container environments, and an interactive connection testing tool was needed.

## Decision
1. **Server-Side SQL Aggregation & Resilient Pagination**:
   - Implemented database-level RPC functions `public.get_cash_flow_summary` and `public.get_financial_analytics` in migration `20261003100000_fix_mcp_statement_sync_and_cash_flow_rpc.sql`. Aggregations (`SUM`, `COUNT`, category breakdowns) now execute directly in PostgreSQL using `SECURITY DEFINER` with fixed search paths.
   - Updated `get_cash_flow_summary` and `get_financial_analytics` in TypeScript to query the RPCs first.
   - Added a paginated fallback loop (fetching in 1,000-row chunks) if the RPC is ever unavailable, ensuring results are never truncated regardless of data volume.

2. **Fail-Fast Startup Validation and Strict Error Handling**:
   - Hardened `loadConfig()` to parse JWT payloads and reject `anon` keys in `SUPABASE_SERVICE_ROLE_KEY` immediately at startup with an explicit fatal error message.
   - Enforced UUID validation on `FINTRACK_USER_ID`.
   - Updated `ensureUserFilter` and created `resolveTargetUserId` to throw explicit errors when a user UUID is missing or invalid, preventing silent un-scoped queries.

3. **Explicit User ID Propagation in Statement Item Sync**:
   - Updated `private.sync_bank_statement_item_to_cash_flow()` to query `user_id` from the parent `public.bank_statements` record and pass it explicitly in the `INSERT INTO public.cash_flow` statement.
   - Because `user_id` is supplied, `private.set_user_id()` bypasses the `auth.uid()` null check, allowing `service_role` and background processes to import statement items seamlessly.

4. **Bank Statement Import & Management Tools**:
   - Added `create_bank_statement` to `mcp-server/src/tools/statements.ts`. It accepts `bank_name`, `statement_period`, opening/closing balances, PDF uploads (`pdf_base64`, `file_base64`, `local_file_path`, or existing `storage_path`), and an array of mutation items (`CR`/`DB`/`income`/`expense`).
   - Supports direct upload of statement PDFs to Supabase Storage bucket `statements` with standard path scoping (`${userId}/${bankName}/${timestamp}-${random}.pdf`), automatic signed URL generation, and rollback cleanup if DB insert fails.
   - Leverages transactional RPC `public.create_bank_statement_with_items` with graceful fallback to batch client insert, returning `statement_id` and all `items[]` populated with their auto-generated `cash_flow_id`.
   - Added `create_bank_statement_item` to append mutation items to existing statements and update total item counts.
   - Added `get_statement_file_url` to generate temporary signed download/view URLs for stored statement PDFs.

5. **Diagnostic Tool & Base64 Image Upload Hardening**:
   - Added `check_connection` in `mcp-server/src/tools/system.ts` to test Supabase reachability, key role, user scoping, DB query latency, RPC readiness, and storage bucket access.
   - Hardened `create_receipt` in `mcp-server/src/tools/receipts.ts` to prioritize `image_base64` and avoid treating missing host file paths as storage keys.

## Alternatives Considered
- *Increase PostgREST max_rows in Supabase config*: Rejected because client-side summation transfers unnecessary megabytes of row data over the network and does not solve the root scalability issue. SQL RPCs are faster, lighter, and atomic.
- *Client-side pagination only*: Considered, but SQL aggregation is orders of magnitude faster (single-digit milliseconds vs. multiple network round-trips). We retained client-side pagination as a secondary fallback.
- *Requiring frontend session tokens for statement sync*: Rejected because MCP servers and background workers run as automated services without user interactive login sessions.

## Consequences
### Positive
- Accurate, un-truncated financial analytics and summaries for accounts of any transaction size.
- Immediate fail-fast configuration feedback when credentials or user IDs are misconfigured.
- Automated bank statement import supported directly via agent tool calls without frontend dependency.
- Comprehensive connection diagnosis available via `check_connection`.

### Negative / Trade-offs
- Database migration `20261003100000_fix_mcp_statement_sync_and_cash_flow_rpc.sql` must be applied to Supabase to enable the new RPCs and trigger fix.

## Related Notes
- Migrations:
  - `supabase/migrations/20261003100000_fix_mcp_statement_sync_and_cash_flow_rpc.sql`
  - `supabase/migrations/20261003120000_add_create_bank_statement_rpc.sql`
- MCP Config: `mcp-server/src/config.ts`
- DB Client: `mcp-server/src/db/client.ts`
- Tools: `mcp-server/src/tools/cashflow.ts`, `analytics.ts`, `statements.ts`, `receipts.ts`, `system.ts`
- Previous ADR: [ADR-067: Scoped CI Triggers and VPS Deployment Script](067-scoped-ci-triggers-and-vps-deployment-script.md)
