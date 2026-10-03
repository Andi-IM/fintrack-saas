# ADR-069: Cash Flow Time Precision and MCP Tooling

## Status
Accepted

## Context
Transactions created via the Model Context Protocol (MCP) server previously enforced a date-only format (`YYYY-MM-DD`). When stored into PostgreSQL `TIMESTAMPTZ`, records without explicit time components were recorded as midnight UTC (`00:00:00+00:00`). When displayed in local time zones such as Western Indonesia Time (WIB / UTC+7), transactions always showed up as `07:00:00 WIB`, losing the actual transaction hour and minute.

Additionally, to improve data clarity and avoid ambiguous column semantics, the database schema needed explicit time precision (`transaction_time`) while retaining `created_at` for audit trails and maintaining full backward compatibility with the existing web frontend and database views.

## Decision
1. **Database Schema & Synchronization**:
   - Ensure `public.cash_flow.date` is of type `TIMESTAMPTZ`.
   - Add column `public.cash_flow.transaction_time TIMESTAMPTZ DEFAULT now()`.
   - Add a trigger `private.sync_cash_flow_transaction_time()` to bidirectionally synchronize `date` and `transaction_time`, ensuring full backward compatibility with the Next.js frontend repository (`dashboard_cash_flow_entries` view, reports, and legacy inputs) while supporting `transaction_time` natively.
   - Enforce validation in trigger preventing transaction dates more than 1 day in the future (`transaction_time <= now() + INTERVAL '1 day'`).
   - Add composite index on `(user_id, transaction_time DESC)`.
   - Backfill existing rows whose time was truncated to midnight using `created_at`.

2. **MCP Tooling Updates**:
   - `create_cash_flow_entry`:
     - Added optional `transaction_time` parameter accepting ISO 8601 timestamps (e.g. `2026-10-03T14:30:00+07:00`). Defaults to `now()` if omitted.
     - Preserves current time when only `YYYY-MM-DD` is supplied instead of collapsing to midnight UTC.
     - Validates future time constraint (`<= now() + 1 day`).
   - `list_cash_flow`:
     - Explicitly surfaces `transaction_time` and `created_at` alongside `date`.
     - Supports end-of-day boundary filtering for date range queries (`YYYY-MM-DD` extends to `23:59:59.999Z` to prevent excluding midday transactions).

## Consequences
### Positive
- Exact transaction hours and minutes are preserved for transactions created through agents, CLI, and MCP.
- No more false `07:00 WIB` / midnight timestamps on newly recorded transactions.
- Zero breaking changes to the existing Next.js frontend or database reporting views.
- Past midnight-truncated transactions restored via `created_at` backfill.

### Negative / Trade-offs
- Migration `20261003110000_add_transaction_time_to_cash_flow.sql` must be applied to Supabase.

## Related Notes
- Migration: `supabase/migrations/20261003110000_add_transaction_time_to_cash_flow.sql`
- MCP Tool: `mcp-server/src/tools/cashflow.ts`
- Previous ADR: [ADR-068: MCP Server Reliability, SQL Aggregation, and Bank Statement Import](068-mcp-server-reliability-and-statement-import.md)
