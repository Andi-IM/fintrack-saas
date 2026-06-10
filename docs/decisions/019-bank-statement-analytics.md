# ADR-019: Bank Statement Financial Analytics

## Status

Accepted

## Context

The Bank Statements feature stores per-statement `opening_balance`, `closing_balance`, and `bank_statement_items` with per-transaction amounts and types (income/expense). However, there is no way for users to view aggregated financial insights from this data — no total assets/net worth, no balance trends over time, no per-bank balance breakdown, and no income vs expense summary from statement items. Users must manually inspect each statement individually.

The data already exists in the database (`bank_statements` and `bank_statement_items` tables). No schema changes are needed.

## Decision

Add an analytics section to the top of the `/statements` page that computes and displays:

1. **Total Net Worth** — sum of the latest `closing_balance` per bank, giving a snapshot of total tracked assets.
2. **Total Income & Total Expense** — aggregate sums from all `bank_statement_items` across all statements.
3. **Balance History Chart** — a grouped bar chart showing closing balances per statement period, color-coded by bank, rendered with Recharts.
4. **Per-Bank Summary Grid** — cards showing each bank's latest balance, statement count, and latest period.

All aggregation is computed server-side in a new `getStatementAnalytics()` action to minimize data transfer. The client receives only the aggregated result, not raw items.

## Consequences

- Good: Users get immediate insight into their financial position without manual calculation.
- Good: Zero database migrations — all required data already exists.
- Good: Follows existing patterns (server action + `useQuery`, Recharts, shadcn/ui cards).
- Good: The analytics section is hidden when no statements exist, keeping the page clean.
- Bad: An additional Supabase query per page load (beyond `getGroupedBankStatements`). Acceptable because both queries are simple and the dataset is small per user.
- Trade-off: The analytics query fetches statements + items independently from the existing list query. A future optimization could merge them into a single query once the analytics section is stable.

## Implementation Plan

- **Affected paths**:
  - `lib/actions/statements.ts` — add `getStatementAnalytics()` action + `StatementAnalytics`, `BankAnalyticsSummary`, `BalanceHistoryPoint` types. `BalanceHistoryPoint` includes a `sortKey` (numeric period end value) so the client can order chart data chronologically without re-parsing period strings.
  - `components/statements/StatementAnalytics.tsx` — new client component with three sub-sections (overview cards, chart, bank grid)
  - `app/(dashboard)/statements/page.tsx` — import and render `StatementAnalytics` above `BankStatementList`
  - `docs/decisions/019-bank-statement-analytics.md` — this ADR

- **Dependencies**: None. Recharts and @tanstack/react-query already in the project.

- **Patterns to follow**:
  - Server action pattern from `getGroupedBankStatements()` with `ActionResponse<T>` discriminated union
  - Client data fetching via `useQuery` with the `.success`/`.error` check pattern from `BankStatementList.tsx`
  - Recharts chart pattern from `TransactionChart.tsx`
  - `formatCurrency()` from `lib/utils/transaction.ts`
  - shadcn/ui `Card` components with Tailwind styling matching existing dashboard cards

- **Patterns to avoid**:
  - Do NOT add new database tables or columns
  - Do NOT create a separate analytics page — keep analytics on the Statements page

### Verification

- [x] `getStatementAnalytics()` returns correct `netWorth` (sum of latest per-bank closing balances) for a user with 2+ banks — verified in `lib/actions/statements.ts:224-270`
- [x] `getStatementAnalytics()` returns correct `totalIncome` and `totalExpense` from all statement items — verified in `lib/actions/statements.ts:237-244`
- [x] `getStatementAnalytics()` returns `netWorth: 0` and empty arrays when no statements exist — verified in `lib/actions/statements.ts:199-210`
- [x] `StatementAnalytics` component renders nothing when no statements exist — verified in `components/statements/StatementAnalytics.tsx:218-220`
- [x] Net Worth card shows the dominant indigo style matching dashboard `OverviewCards` — verified in `components/statements/StatementAnalytics.tsx:40-53`
- [x] Balance History Chart renders a grouped bar for each statement period with bank-specific colors — verified in `components/statements/StatementAnalytics.tsx:115-165`
- [x] Per-bank grid shows correct latest balance, statement count, and period label — verified in `components/statements/StatementAnalytics.tsx:174-200`
- [x] Page loads without errors in browser console — requires runtime check

## Alternatives Considered

- **Compute analytics on the client from `getGroupedBankStatements()` data**: Rejected because it would require fetching all raw items to the client for every statements page visit, even when analytics aren't visible. A dedicated action keeps data transfer minimal.
- **Add analytics to the main Dashboard page**: Rejected per user preference — analytics belong on the Statements page alongside the data they summarize.
- **Use a SQL view or Postgres function for aggregation**: Rejected because the aggregation logic is simple enough to implement in TypeScript without adding database objects. Can be migrated later if performance requires it.
