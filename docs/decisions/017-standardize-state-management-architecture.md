# ADR-017: Standardize State Management Architecture

## Status
Accepted

## Context
As the FinTrack SaaS frontend application grows, the current reliance on local `useState` hooks for handling complex async states, local multi-field forms, scanner state flows, and URL query manipulations has introduced significant boilerplate, potential sync errors, lack of caching, and suboptimal UI reactivity. 

To improve maintainability, performance, caching capabilities, and visual responsiveness, we need to enforce a clear, standardized architecture for state management based on the project's expert guidelines.

## Decision
We will standardize the frontend state management across the following layers:

1. **Async State (Server Data on Client)**: Implement `@tanstack/react-query` (TanStack Query) for fetching, caching, mutating, and synchronizing server-side data on the client. Manual `useState` + `useEffect` fetch loops are banned for shared server resource lists (e.g., bank statements).
2. **Global & Complex Client State**: Use `zustand` to manage complex client-side workflows (e.g., the OCR scanning flow) to separate UI layout logic from business flow state.
3. **Form State**: Use `react-hook-form` coupled with `zod` schema resolvers for input forms (e.g., manual transaction entries) to enforce type-safe validation, error display, and form submit handlers.
4. **URL state**: Use `nuqs` to synchronize parameters like filter range and filter dates to the URL in a type-safe manner, eliminating custom `URLSearchParams` boilerplate.
5. **Optimistic Updates**: Enforce immediate UI feedback on state mutations (like deleting a transaction) with fallback error handling.

## Alternatives Considered
- **Redux Toolkit**: Rejected due to high setup boilerplate and complex overhead for a lightweight SaaS app. Zustand provides a much simpler hook-based interface.
- **Context API for everything**: Rejected because Context API triggers re-renders on all consumers when value changes, making it inefficient for frequently updating client state like forms or progress counters.

## Consequences
- **Positive**:
  - Unified state patterns, reducing cognitive load for developers.
  - Automatic caching and background revalidation of data through React Query.
  - Proper form validation before submission, preventing invalid API payloads.
  - Clean separation of scanner logic from UI layout, making components simpler and testable.
- **Trade-offs**:
  - Increases total package size by adding ~5 lightweight dependencies.
  - Requires wrapping layout with a `QueryClientProvider`.
