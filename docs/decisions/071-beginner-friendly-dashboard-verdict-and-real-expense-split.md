# ADR-071: Beginner-Friendly Dashboard Verdict, Real vs Transfer Split, and Actionable Insights

## Status
Accepted

## Context
A UX review of the dashboard (`app/(dashboard)/page.tsx`) found that lay users must read several raw numbers and infer their financial health. Totals also sum internal fund movements (transfers between own accounts, e-wallet top-ups, ATM withdrawals) with real spending, so users feel they overspend when they do not. The AI insight was descriptive instead of actionable, and the savings ratio had no benchmark.

The `cash_flow` data has no explicit "transfer" flag, so detection must rely on `main_category` and `description`.

## Decision
- Add a one-sentence health verdict banner above the overview cards (deficit / thin surplus / healthy).
- Split income/expense into "Pemasukan Riil" / "Pengeluaran Riil" and show "Pemindahan dana" separately. Net Balance remains the raw total.
- Show the savings ratio as a progress bar toward the 20% target (50/30/20 rule).
- Replace the descriptive volatility insight with a concrete suggestion: emergency fund of 6–12 × average real monthly expense.
- Centralize logic in `lib/utils/dashboard-summary.ts` (`summarizeEntries`, `isFundTransfer`, `emergencyFundRange`), using a keyword heuristic for transfers.
- Deferred (low priority): trend arrows vs previous period and chart reference zones.

## Alternatives Considered
- **Add an `is_transfer` column**: more accurate, but needs a migration, a backfill, and parser changes. Deferred until the heuristic proves insufficient.
- **Keep totals unchanged**: rejected because it misleads users.

## Consequences
- Positive: users get an immediate verdict and an actionable next step. Metrics reflect real spending.
- Trade-offs: the keyword heuristic can misclassify entries (for example, a genuine payment described as "transfer"). Cash withdrawals are treated as fund movements.
- Risk: the dashboard Income/Expense figures now differ from the raw totals on other pages.

## Related Notes
- `frontend/components/dashboard/OverviewCards.tsx`
- `frontend/components/dashboard/FinancialInsights.tsx`
- `frontend/lib/utils/dashboard-summary.ts`
