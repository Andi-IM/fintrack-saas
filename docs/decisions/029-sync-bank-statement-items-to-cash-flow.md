# ADR-029: Sync Bank Statement Items to Cash Flow via Database Triggers

## Status

Accepted

## Context

Users upload bank statements (which populates the `bank_statement_items` table) and scan receipts (which populates the `receipts` table). The dashboard overview, charts, and main transaction history pages query only the `cash_flow` table, which is built for manual cash flow entries. Consequently, uploaded bank statement items do not automatically show up on the main dashboard and history page.

To solve this, we need to bridge the bank statement items and the cash flow entries. If we do a query-level combination (e.g. UNION), it increases complexity of filtering, sorting, pagination, and data-fetching code in the frontend. If we use a database sync approach, we treat the `cash_flow` table as the single source of truth, making queries simpler and faster.

We need to decide on a synchronization strategy that replicates bank statement transactions into the `cash_flow` table, handles updates, cleans up deleted items, links them to receipts without double-counting, and migrates existing data.

## Decision

We will use **PostgreSQL Database Triggers** on the `bank_statement_items` table to automate synchronization, and enhance the frontend to handle the larger volume of data elegantly:

1. **Insert Trigger**: When a bank statement item is inserted, a BEFORE trigger creates a corresponding `cash_flow` record (copying date, description, type, amount, category, and payment method from the statement/bank details) and stores its ID in `bank_statement_items.cash_flow_id` for referential integrity.
2. **Update Trigger**: When a bank statement item is updated, a BEFORE trigger updates the corresponding `cash_flow` record if relevant details (date, amount, type, description, category) have changed.
3. **Delete Trigger**: When a bank statement item is deleted, an AFTER trigger deletes the corresponding `cash_flow` entry. If the cash flow entry has a receipt linked to it (`receipt_id IS NOT NULL`), it is preserved and only its `source_item_id` is set to `NULL` to prevent deleting user receipts.
4. **Data Migration**: A one-time SQL script is executed to backfill and link `cash_flow` rows for all existing unreconciled statement items (415 items) currently in the database.
5. **Types Update**: Update `database.types.ts` to rename `transaction_id` to `cash_flow_id` on the `bank_statement_items` table definition.
6. **Frontend Enhancement (Pagination & Filters)**:
   - Implement client-side pagination (10, 15, 25, 50, 100 items per page) on `/transactions` to handle the expanded transaction list efficiently.
   - Change the default range filter on `/transactions` to `'ALL'` to show all historical transactions, and add a **Time Range** select filter to the toolbar.
   - Add a keyword search input and dropdown filters for Category, Payment Method, and Data Source (Receipt, Bank Statement, Manual).
   - Sync all filter and pagination states to the URL query parameters using `nuqs` (`shallow: true`) to make views shareable and bookmarkable.

## Alternatives Considered

- **Application-Level Sync**: Writing sync code inside the `saveBankStatement` server action. Rejected because it wouldn't handle inserts via the database GUI/direct API, would duplicate code if new upload scripts are written, and is harder to keep transactionally atomic.
- **Dynamic Query Union (Option A)**: Constructing complex SQL queries that UNION `cash_flow`, unlinked `receipts`, and `bank_statement_items` dynamically in Next.js server actions. Rejected because it would require rewriting the charts, overview cards, search, and pagination components, which are already optimized to read from a single table.
- **Server-Side Pagination & Filters**: Fetching only paginated results from Supabase based on URL parameters. Rejected for now because the dataset is small enough (< 500 rows, < 100KB) that loading all items at once client-side enables instantaneous, lag-free filtering, search, and page transitions without server round-trips.

## Consequences

- **Good**: High-performance dashboard queries with a single source of truth table (`cash_flow`).
- **Good**: Code simplification across charts, overview, and history list.
- **Good**: Database-level referential integrity and automation that runs regardless of the entry point (API, admin, upload).
- **Good**: Automatic reconciliation support where cash flows can link to both a receipt and a statement item.
- **Good**: One-time migration backfills existing data instantly.
- **Good**: Fluid and premium frontend user experience with instant filters, searches, and page transitions.
- **Good**: URL state synchronization allows bookmarking and sharing specific transaction filters.
- **Trade-off**: Requires database triggers which can be harder to debug than application code, though the trigger logic here is straightforward and well-defined.
- **Trade-off**: Client-side filtering loads the entire transaction dataset into browser memory, which is highly performant for thousands of rows but may need to be transitioned to server-side paginated queries if the database grows beyond tens of thousands of records.
