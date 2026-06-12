# ADR-029: Sync Bank Statement Items to Cash Flow via Database Triggers

## Status

Accepted

## Context

Users upload bank statements (which populates the `bank_statement_items` table) and scan receipts (which populates the `receipts` table). The dashboard overview, charts, and main transaction history pages query only the `cash_flow` table, which is built for manual cash flow entries. Consequently, uploaded bank statement items do not automatically show up on the main dashboard and history page.

To solve this, we need to bridge the bank statement items and the cash flow entries. If we do a query-level combination (e.g. UNION), it increases complexity of filtering, sorting, pagination, and data-fetching code in the frontend. If we use a database sync approach, we treat the `cash_flow` table as the single source of truth, making queries simpler and faster.

We need to decide on a synchronization strategy that replicates bank statement transactions into the `cash_flow` table, handles updates, cleans up deleted items, links them to receipts without double-counting, and migrates existing data.

## Decision

We will use **PostgreSQL Database Triggers** on the `bank_statement_items` table to automate synchronization:

1. **Insert Trigger**: When a bank statement item is inserted, a BEFORE trigger creates a corresponding `cash_flow` record (copying date, description, type, amount, category, and payment method from the statement/bank details) and stores its ID in `bank_statement_items.cash_flow_id` for referential integrity.
2. **Update Trigger**: When a bank statement item is updated, a BEFORE trigger updates the corresponding `cash_flow` record if relevant details (date, amount, type, description, category) have changed.
3. **Delete Trigger**: When a bank statement item is deleted, an AFTER trigger deletes the corresponding `cash_flow` entry. If the cash flow entry has a receipt linked to it (`receipt_id IS NOT NULL`), it is preserved and only its `source_item_id` is set to `NULL` to prevent deleting user receipts.
4. **Data Migration**: A one-time SQL script is executed to backfill and link `cash_flow` rows for all existing unreconciled statement items (415 items) currently in the database.
5. **Types Update**: Update `database.types.ts` to rename `transaction_id` to `cash_flow_id` on the `bank_statement_items` table definition.

## Alternatives Considered

- **Application-Level Sync**: Writing sync code inside the `saveBankStatement` server action. Rejected because it wouldn't handle inserts via the database GUI/direct API, would duplicate code if new upload scripts are written, and is harder to keep transactionally atomic.
- **Dynamic Query Union (Option A)**: Constructing complex SQL queries that UNION `cash_flow`, unlinked `receipts`, and `bank_statement_items` dynamically in Next.js server actions. Rejected because it would require rewriting the charts, overview cards, search, and pagination components, which are already optimized to read from a single table.

## Consequences

- **Good**: High-performance dashboard queries with a single source of truth table (`cash_flow`).
- **Good**: Code simplification across charts, overview, and history list.
- **Good**: Database-level referential integrity and automation that runs regardless of the entry point (API, admin, upload).
- **Good**: Automatic reconciliation support where cash flows can link to both a receipt and a statement item.
- **Good**: One-time migration backfills existing data instantly.
- **Trade-off**: Requires database triggers which can be harder to debug than application code, though the trigger logic here is straightforward and well-defined.
