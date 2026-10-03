# ADR-070: MCP Server Full CRUD Capabilities (Update and Delete Tools)

## Status
Accepted

## Context
Prior iterations of the FinTrack SaaS Model Context Protocol (MCP) server focused primarily on ingestion (`create_cash_flow_entry`, `create_receipt`, `create_bank_statement`) and inspection (`list_...`, aggregations, analytics). While external agents (e.g., Hermes Agent via Podman/Docker stdio) could insert records, they lacked tools to modify (`UPDATE`) or remove (`DELETE`) data.

When errors occurred during manual entry, receipt parsing corrections, or statement reconciliations, agents could not correct typos, update transaction categories, or clean up erroneous records. Adding full, user-scoped CRUD tools across all core business entities was required to grant agents full operational autonomy while ensuring database consistency.

## Decision
We implemented symmetric Update and Delete MCP tools across all three financial domains:

### 1. Cash Flow (`mcp-server/src/tools/cashflow.ts`)
- **`update_cash_flow_entry`**: Allows partial updates to amounts (`income`/`expense`), category (`main_category`, `sub_category`), notes (`description`), payment method (`payment_method`), and transaction time (`transaction_time` / `date`). Validates future date constraints and triggers bidirectional synchronization between `date` and `transaction_time`.
- **`delete_cash_flow_entry`**: Deletes a specific cash flow record by UUID with strict user-scoping verification.

### 2. Receipts (`mcp-server/src/tools/receipts.ts`)
- **`update_receipt`**: Updates receipt header attributes (`store_name`, `date`, `total_price`, `type`, `payment_method`, etc.). If `sync_to_cash_flow` is enabled (default `true`), it automatically propagates updated dates, amounts, and store descriptions to the linked `public.cash_flow` record.
- **`delete_receipt`**: Atomically deletes the receipt record, its child items (`receipts_items`), the associated image in Supabase Storage (`statements` / `receipts`), and optionally the linked `cash_flow` transaction.

### 3. Bank Statements & Mutations (`mcp-server/src/tools/statements.ts`)
- **`update_bank_statement`**: Updates header metadata (`bank_name`, `statement_period`, `opening_balance`, `closing_balance`).
- **`delete_bank_statement`**: Deletes the parent bank statement, all of its mutation line items, associated PDF files in Supabase Storage, and associated cash flow records via database cascade and triggers.
- **`update_statement_mutation`**: Updates a specific mutation item (`date`, `description`, `amount`, `type`, `category`, `balance`). Leveraging the existing database trigger `trg_sync_bank_statement_item_update`, modifications automatically synchronize to the corresponding `public.cash_flow` record.
- **`delete_statement_mutation`**: Deletes a specific mutation line item. The database trigger `trg_sync_bank_statement_item_delete` automatically deletes the associated `cash_flow` row, and the parent statement's `total_items` count is decremented.

## Alternatives Considered
- *Read & Insert Only (Immutable Log)*: Rejected because real-world accounting requires corrections, re-categorizations, and removal of duplicate imports.
- *Handling cascade deletions entirely on the client*: Rejected where triggers already exist. PostgreSQL triggers (`sync_bank_statement_item_to_cash_flow`) guarantee transactional consistency even if network disconnects occur mid-operation.

## Consequences
### Positive
- External agents now have complete CRUD autonomy to create, view, revise, and remove transactions, receipts, and bank statements.
- Database triggers automatically maintain synchronization between child items, receipts, and the primary cash flow ledger without orphaned rows.
- File cleanup in Supabase Storage prevents orphaned binary assets when receipts or statements are deleted.
- Strict `user_id` scoping prevents cross-tenant modification or deletion.

### Negative / Trade-offs
- Deletion operations permanently remove data; agents must confirm IDs carefully before triggering delete tools.

## Related Notes
- Tools:
  - `mcp-server/src/tools/cashflow.ts`
  - `mcp-server/src/tools/receipts.ts`
  - `mcp-server/src/tools/statements.ts`
- Previous ADR: [ADR-069: Cash Flow Time Precision and MCP Tooling](069-cash-flow-time-precision-and-mcp-tooling.md)
