# ADR-053: Server-Side Data Filtering and Pagination

## Status
Accepted

## Context
Our dashboard and transaction pages currently rely on client-side data filtering. The `getCashFlow()` function fetches all cash flow records for the authenticated user without any limit or date restrictions (`SELECT * FROM cash_flow WHERE user_id = auth.uid() ORDER BY date DESC`). The data is then parsed, passed to React components (like `OverviewCards`), and filtered down to the selected time range in memory. 

Furthermore, the `add/page.tsx` page when editing a single transaction fetches the entire transaction list just to extract one record by ID.

As user data grows over time, this results in:
1. Massive network payload sizes (fetching thousands of rows unnecessarily).
2. Slower dashboard initialization (Suboptimal Database Performance + React Re-renders).
3. Database strain due to unbounded `SELECT *` operations on a growing table.

## Decision
We will push data filtering and pagination down to the database layer (Server-Side Filtering) and introduce targeted repository methods. 

Specific actions:
1. Update `CashFlowRepository.findAll` to accept `FilterOptions` (e.g., `range`, `date`).
2. Translate time ranges ("1W", "1M", "3M", "1Y") into PostgreSQL `.gte('date', ...)` queries on the Supabase client.
3. Introduce `CashFlowRepository.findById` to look up individual records efficiently instead of scanning lists.
5. Remove client-side array filtering mechanisms and local array slicing. (like `filterTransactionsByRange`).

## Alternatives Considered
- **Pagination via infinite scroll**: Too complex for a quick win on the dashboard overview, which primarily needs summary data based on specific date buckets rather than paginated lists.
- **Client-Side Caching (React Query / SWR)**: Caching all data might reduce database calls on navigation, but the initial load would still download the full dataset, which remains unscalable.

## Consequences
- **Positive:** Network transfer is minimized to only what the user actively views. Database queries are highly optimized (utilizing the new composite index `idx_cash_flow_user_id_date`). The Edit page will load near-instantly.
- **Trade-offs:** We need to parse time ranges on the server. If a user switches from "1W" to "1Y" in the UI, a new database fetch will be triggered instead of purely filtering local state (although Next.js App Router handles this elegantly via RSCs and Server Actions).

## Related Notes
- Refers to database optimization efforts (Migration 11 & 12).
