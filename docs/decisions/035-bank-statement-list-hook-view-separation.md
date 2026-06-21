# ADR-035: Separate BankStatementList into Hook + View for Testability

## Status
Accepted

## Context
`BankStatementList` is a monolithic component that couples React Query data fetching, four useMutation calls, UI expansion state, confirm dialogs, window.open calls, and JSX rendering in a single file. This makes unit testing difficult because:

- Mutation error handlers (`onError` → `alert`) are unreachable without simulating failed server actions
- `window.confirm` / `window.open` branches are buried inside handlers tightly bound to the component tree
- A dead `queryOptions` object is spread-then-overridden, creating permanently uncovered lines
- The `setExpandedBanks` side-effect inside `queryFn` is a state mutation during query execution, which is untestable in isolation
- The component renders both desktop table and mobile card views simultaneously in JSDOM, complicating selector-based assertions

The `cash-flow` feature demonstrates the established pattern: extract logic into a `hooks/` file, keep the component as a thin view layer.

## Decision
Refactor `BankStatementList` following the existing feature hook pattern:

1. Extract all React Query and mutation logic into `hooks/use-bank-statements.ts`
2. Fix the dead `queryOptions` object and move the auto-expand side-effect to a `useEffect`
3. Move `formatDateForInput` to `lib/utils/date.ts` as a pure exported function
4. Rename the component file to `BankStatementListView` (presentational, accepts hook return as props)
5. Keep `BankStatementList` as a thin container that wires the hook to the view
6. Add `__tests__/use-bank-statements.test.ts` covering all mutation paths, error handlers, and confirm branches via `renderHook`

## Alternatives Considered
- **Prop injection pattern**: Accept the hook as a prop for full injectability. Rejected as over-engineering for current scale; the hook is sufficient for isolation.
- **Leave as-is, add more component tests**: Rejected because the confirm/error branches require fighting React Query internals and async timing in JSDOM.

## Consequences
- **Positive**: All mutation error handlers, confirm-rejection branches, and `handleViewFile` failure path become directly testable via `renderHook` without DOM interaction
- **Positive**: View component tests simplify to prop-passing assertions
- **Positive**: `formatDateForInput` edge cases (invalid date) are unit-testable in isolation
- **Trade-off**: Adds two new files (`hooks/use-bank-statements.ts`, `lib/utils/date.ts`) and splits one component into a container + view pair

## Related Notes
- Follows pattern established in `features/cash-flow/hooks/use-cash-flow-controller.ts`
- ADR-017 mandates TanStack Query for async state; hook extraction preserves this
- ADR-033 feature-based architecture is maintained — hook stays inside the feature directory

