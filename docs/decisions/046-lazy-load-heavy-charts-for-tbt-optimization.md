# ADR-046: Lazy Loading Heavy Client Components to Optimize Total Blocking Time (TBT)

## Status
Accepted

## Context
During performance audits using Lighthouse, specifically for mobile device simulation, we discovered severe performance bottlenecks on the Dashboard (`/`) and Bank Statements (`/statements`) routes.
- **Total Blocking Time (TBT)**: Reached 600ms on `/statements` and over 250ms on `/`, far exceeding the "Good" threshold.
- **Largest Contentful Paint (LCP)**: Exceeded 3.4 seconds on mobile.
- **Root Cause**: The Next.js App Router was eagerly executing massive JavaScript chunks on the client's main thread during initial hydration. Specifically, the `recharts` library (Chunk 210) and heavy Data Tables (Chunk 399) were requiring over 2.8 seconds of CPU evaluation time. Because these were imported statically, they blocked the browser from painting the critical LCP text elements.

## Decision
We will implement an aggressive Code Splitting and Lazy Loading strategy using React's `next/dynamic` combined with Client Component Wrappers:
1. **Client Wrappers**: We create intermediary Client Components (e.g., `DynamicCharts.tsx`, `DynamicStatementComponents.tsx`) marked with `'use client'`.
2. **SSR Opt-out for Heavy JS**: Inside these wrappers, we use `next/dynamic` to import the heavy components (like `TransactionChart`, `FinancialInsights`, `StatementAnalytics`, and `BankStatementList`) with the `{ ssr: false }` flag.
3. **Suspense Boundaries (TTFB fix)**: Data fetching (`await getCashFlow()`) at the route level is pushed down into independent async server components and wrapped in `<Suspense>`, allowing the initial shell and LCP element (e.g., `<h1>Dashboard Overview</h1>`) to stream instantly from the server without waiting for database resolution.

## Alternatives Considered
- **Keeping SSR enabled for charts (`ssr: true`)**: Rejected. Next.js still bundles the JS payload to the client during initial hydration, causing the browser to parse and compile Recharts, which still choked the main thread and ruined the TBT.
- **Using pure React.lazy()**: Rejected. `next/dynamic` is better optimized for the Next.js ecosystem and allows seamless integration with loading skeletons.

## Consequences
- **Positive Impacts**: 
  - TBT plummeted from 600ms to 110ms (Excellent/Green score).
  - First Load JS for the `/statements` route plummeted from 264 kB down to 116 kB.
  - LCP is unblocked as the HTML shell is painted instantaneously.
- **Trade-offs**: 
  - Heavy components will display a loading skeleton upon initial page load while their JS chunks are downloaded in the background.
  - Slight increase in code complexity due to the separation of statically imported vs dynamically imported client wrappers.

## Related Notes
- Modified `app/(dashboard)/page.tsx` and `app/(dashboard)/statements/page.tsx`
- Added wrappers: `components/dashboard/DynamicCharts.tsx` and `components/statements/DynamicStatementComponents.tsx`
- Refer to `lighthouse.json` metrics for benchmark proof.
