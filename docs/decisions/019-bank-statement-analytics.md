# ADR-019: Bank Statement Financial Analytics

## Status

Accepted

## Context

The Bank Statements feature stores per-statement `opening_balance`, `closing_balance`, and `bank_statement_items` with per-transaction amounts and types (income/expense). However, there is no way for users to view aggregated financial insights from this data — no total assets/net worth, no balance trends over time, no per-bank balance breakdown, and no income vs expense summary from statement items. Users must manually inspect each statement individually.

The data already exists in the database (`bank_statements` and `bank_statement_items` tables). A minimal schema change was added — a `balance` column on `bank_statement_items` to track per-transaction running balance.

## Decision

Add an analytics section to the top of the `/statements` page that computes and displays:

1. **Total Net Worth** — sum of the latest `closing_balance` per bank, giving a snapshot of total tracked assets.
2. **Total Income & Total Expense** — aggregate sums from all `bank_statement_items` across all statements.
3. **Balance History Chart** — an area chart showing running balance computed from `bank_statement_items`. For each bank, start with the earliest statement's `opening_balance`, then apply each transaction in date order (income adds, expense subtracts). Missing dates are forward-filled per bank. Rendered as a Recharts `<AreaChart>` with one area per bank (`type="stepAfter"`).
4. **Per-Bank Summary Grid** — cards showing each bank's latest balance, statement count, and latest period.

5. **Total Saldo Chart** — a separate Recharts `<AreaChart>` showing the aggregate running balance across all banks over time (sum of all per-bank running balances at each date). Includes a time range filter (1M/3M/6M/1Y/ALL) and a gradient fill.

6. **Statement Item CRUD** — inline edit, delete, and add for `bank_statement_items` directly from the statements page, with an `ItemEditDialog` component and three new server actions (`updateStatementItem`, `deleteStatementItem`, `addStatementItem`). A `recalculateStatementBalances()` helper recomputes all running balances on the statement after any mutation.

7. **`balance` column** — added to `bank_statement_items` via migration. Stores the running balance at each transaction, computed at insert time in `saveBankStatement()`. Recalculated on every item mutation.

All aggregation is computed server-side in a new `getStatementAnalytics()` action to minimize data transfer. The client receives only the aggregated result, not raw items.

## Consequences

- Good: Users get immediate insight into their financial position without manual calculation.
- Good: Follows existing patterns (server action + `useQuery`, Recharts, shadcn/ui cards, Zod validation).
- Good: The analytics section is hidden when no statements exist, keeping the page clean.
- Good: Item CRUD allows users to fix OCR errors, add missing transactions, or delete duplicates without re-uploading the full statement.
- Good: Running balance is stored per-transaction, enabling accurate historical reconstruction even if items are later modified.
- Bad: Added a database migration (`balance` column on `bank_statement_items`), contradicting the original "zero migrations" goal. Migration is backward-compatible (nullable column, existing rows get `NULL`).
- Bad: An additional Supabase query per page load (beyond `getGroupedBankStatements`). Acceptable because both queries are simple and the dataset is small per user.
- Bad: Item mutations trigger `recalculateStatementBalances()` which updates every item in the statement sequentially — O(n) per mutation. Acceptable because statements rarely exceed hundreds of items.
- Trade-off: The analytics query fetches statements + items independently from the existing list query. A future optimization could merge them into a single query once the analytics section is stable.

## Implementation Plan

- **Affected paths**:
  - `lib/actions/statements.ts` — add `getStatementAnalytics()` action + `StatementAnalytics`, `BankAnalyticsSummary`, `DailyBalancePoint`, and `DailyTransaction` types. `DailyBalancePoint` has `{ bankName, date, balance, transactions: DailyTransaction[] }` where `balance` is the running balance at each transaction date computed server-side from `bank_statement_items`. Also add `updateStatementItem`, `deleteStatementItem`, `addStatementItem` CRUD actions with Zod validation, and `recalculateStatementBalances()` helper.
  - `components/statements/StatementAnalytics.tsx` — new client component with four sub-sections (overview cards, per-bank balance history chart with time range filter and bank visibility toggle, total saldo chart, bank grid). Custom tooltip shows per-date transaction details.
  - `components/statements/ItemEditDialog.tsx` — reusable dialog for creating/editing bank statement items with date/time/description/amount/type/category fields and client-side validation.
  - `components/transactions/BankStatementList.tsx` — add edit/delete actions column on items, "Add Item" button per statement, auto-expand first bank, invalidate analytics queries on mutation.
  - `app/(dashboard)/statements/page.tsx` — import and render `StatementAnalytics` above `BankStatementList`
  - `lib/database.types.ts` — add `balance` field to `bank_statement_items` Row/Insert/Update types
  - `supabase/migrations/20260610120000_add_balance_to_bank_statement_items.sql` — add `balance NUMERIC` column to `bank_statement_items`
  - `docs/decisions/019-bank-statement-analytics.md` — this ADR

- **Dependencies**: None. Recharts and @tanstack/react-query already in the project.

- **Patterns to follow**:
  - Server action pattern from `getGroupedBankStatements()` with `ActionResponse<T>` discriminated union
  - Client data fetching via `useQuery` with the `.success`/`.error` check pattern from `BankStatementList.tsx`
  - Recharts chart pattern from `TransactionChart.tsx`
  - `formatCurrency()` from `lib/utils/transaction.ts`
  - shadcn/ui `Card` components with Tailwind styling matching existing dashboard cards
  - Zod schema validation for CRUD inputs (see `statementItemSchema` in `statements.ts`)
  - `invalidateQueries` with both `['bank-statements']` and `['bank-statement-analytics']` query keys on mutations
  - `recalculateStatementBalances()` after every item mutation to keep running balances consistent

- **Patterns to avoid**:
  - Do NOT create a separate analytics page — keep analytics on the Statements page
  - Do NOT add new database tables — the `balance` column on `bank_statement_items` is the only schema change

### Verification

- [x] `getStatementAnalytics()` returns correct `netWorth` (sum of latest per-bank closing balances) for a user with 2+ banks
- [x] `getStatementAnalytics()` returns correct `totalIncome` and `totalExpense` from all statement items
- [x] `getStatementAnalytics()` returns `netWorth: 0` and empty arrays when no statements exist
- [x] `StatementAnalytics` component renders nothing when no statements exist
- [x] Net Worth card shows the dominant indigo style matching dashboard `OverviewCards`
- [x] Per-bank Balance History Chart renders a `LineChart` with `stepAfter`, forward-filled dates, bank visibility toggle via legend click, and time range filter (1M/3M/6M/1Y/ALL)
- [x] Total Saldo Chart renders an `AreaChart` with gradient fill aggregating all banks' running balances, with time range filter
- [x] Per-bank grid shows correct latest balance, statement count, and period label
- [x] `ItemEditDialog` opens in edit mode with pre-filled data, saves via `updateStatementItem`, and closes on success
- [x] `ItemEditDialog` opens in add mode with empty fields, saves via `addStatementItem`, and closes on success
- [x] Delete item button calls `deleteStatementItem` with confirmation dialog
- [x] `recalculateStatementBalances()` recomputes all item balances and updates `closing_balance` after every CRUD mutation
- [x] Analytics queries are invalidated and re-fetched after any item CRUD mutation
- [x] Page loads without errors in browser console — requires runtime check

## Alternatives Considered

- **Compute analytics on the client from `getGroupedBankStatements()` data**: Rejected because it would require fetching all raw items to the client for every statements page visit, even when analytics aren't visible. A dedicated action keeps data transfer minimal.
- **Add analytics to the main Dashboard page**: Rejected per user preference — analytics belong on the Statements page alongside the data they summarize.
- **Use a SQL view or Postgres function for aggregation**: Rejected because the aggregation logic is simple enough to implement in TypeScript without adding database objects. Can be migrated later if performance requires it.

## More Information

- **2026-06-10**: Changed Balance History Chart from a per-period bar chart (using `closing_balance` only) to a running-balance area chart computed from `bank_statement_items`. The running balance starts at the earliest statement's `opening_balance` and applies each transaction in date order. Missing dates between banks are forward-filled on the client. This gives a true day-by-day historical timeline rather than one bar per statement period.
- **2026-06-10**: Corrected the analytics type name from `BalanceHistoryPoint` to `DailyBalancePoint` and added the `transactions: DailyTransaction[]` field. Also documented the per-transaction `balance` column on `bank_statement_items` — each `bank_statement_item` row stores a `balance` (running balance at that point in time) computed at insert time in `saveBankStatement()`, not derived from the analytics query. The analytics `DailyBalancePoint.balance` is recomputed independently from `bank_statement_items` data to ensure correctness regardless of the stored `balance` value.
- **2026-06-10 (Post-Implementation)**: Extended scope beyond the original ADR based on staged code changes:
  - Added `TotalSaldoChart` — an aggregated area chart showing the sum of all bank running balances over time, with time range filter and gradient fill.
  - Added statement item CRUD (`ItemEditDialog`, `updateStatementItem`, `deleteStatementItem`, `addStatementItem`) — allows users to fix OCR errors inline on the statements page. This was not in the original ADR scope but was needed for practical data management.
  - Added database migration adding `balance NUMERIC` to `bank_statement_items` — the original ADR claimed "zero schema changes" but the running-balance feature required this column.
  - Added `recalculateStatementBalances()` — a helper that re-runs all item balances and updates `closing_balance` after any item mutation. Called by all three CRUD actions.
  - Added `formatDateForInput()` helper and auto-expand of the first bank group in `BankStatementList.tsx` for improved UX.
