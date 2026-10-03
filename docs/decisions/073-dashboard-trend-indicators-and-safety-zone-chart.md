# ADR-073: Dashboard Trend Indicators and Safety Zone Chart Reference Lines

## Status
Accepted

## Context
In ADR-071, we added health banners, split real vs transfer spending, and actionable recommendations. Lay users further need:
1. **Trend Indicators**: Seeing whether expenses and income increased or decreased compared to the previous period (e.g. `↑ 12% vs periode lalu`).
2. **Safety Zones on Charts**: Lay users need visual reference lines on financial charts to understand "how much is enough" (e.g., Green line for healthy target, Red line for safe minimum threshold/break-even).

## Decision
1. **Trend Indicators**:
   - Provide comparison metrics against the previous period for OverviewCards (`Pemasukan Riil`, `Pengeluaran Riil`, and `Net Balance`).
   - Calculate percentage change: `((current - previous) / previous) * 100`.
   - Use contextual styling:
     - Lower expense is positive (emerald `↓`). Higher expense is a warning (rose `↑`).
     - Higher income is positive (emerald `↑`). Lower income is a warning (rose `↓`).
     - Higher net balance is positive (emerald `↑`).
2. **Chart Safety Zones (`TransactionChart.tsx`)**:
   - Provide a view mode switcher in `TransactionChart`:
     - **Arus Kas (Cash Flow)**: Shows daily Income & Expense areas.
     - **Tren Saldo (Cumulative Balance)**: Shows the running cumulative balance over the selected time range.
   - On the chart, add Recharts `ReferenceLine` markers:
     - **Green Line (`#10b981`)**: Target Aman / Surplus Target (Target 20% tabungan).
     - **Red Line (`#f43f5e`)**: Batas Minimum Aman (y = 0 break-even / ambang defisit).
3. **Repository & Actions**:
   - Add previous period retrieval support in `getDashboardCashFlow` or `findDashboardEntries` to compute previous period summary cleanly without client-side waterfalls.

## Alternatives Considered
- **Only static hardcoded threshold for charts**: Rejected because user income/expenses vary widely between accounts (e.g. millions vs hundreds of thousands). Thresholds must be dynamic based on the user's actual financial range and the 50/30/20 benchmark.
- **Client-side waterfall fetching for previous period**: Rejected to preserve low TTFB and TBT.

## Consequences
- **Positive**: Users immediately see trajectory (trends) and financial benchmarks directly on the charts without cognitive overload.
- **Trade-offs**: Slightly larger data query when comparing against previous period; mitigated by lightweight indexed date queries.
