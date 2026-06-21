# ADR-047: Standardize Frontend Testing with Repository Pattern

## Status
Accepted

## Context
Following the transition to the Frontend Repository Pattern—which decouples database access from Server Actions and UI components—we observed massive failures across frontend test suites (e.g., 185 tests failed due to mock mismatch). The UI tests were failing primarily because:
1. The return data shapes from Server Actions and Repositories had changed (e.g., introduction of relational fields like `receipt_id` and grouped dictionary structures).
2. Missing global context providers during test rendering (e.g., `QueryClientProvider` for React Query and `NuqsTestingAdapter` for URL query state management).
3. Test state leakages caused by incomplete manual resets of `vi.mock` variables.

## Decision
To maintain a 100% test pass rate and ensure accurate behavioral testing under the Repository Pattern architecture, we enforce the following testing standards:

1. **Mock Data Synchronization**: All test fixtures and dummy data (`mockTransactions`, etc.) must strictly conform to the new Repository return interfaces defined in `lib/database.types.ts` or the specific Repository output structures.
2. **Context Provider Wrappers**: Any component test utilizing `useQuery`, `useMutation`, or `useQueryState` must be rendered within its respective Context Provider.
3. **Action and Repository Mocking**: 
   - For UI components: Mock the Server Actions that are called by the component.
   - For Server Actions: Inject Fake Repositories (`FakeCashFlowRepository`, etc.) via existing setter methods (`setCashFlowRepository(...)`) instead of mocking Supabase directly.
4. **State Isolation**: Any global or manual mocks (such as `nuqs` query states) must be explicitly cleared using `vi.clearAllMocks()` and variable resets within `beforeEach()` blocks to prevent state leakage between tests.

## Alternatives Considered
- **Mocking Supabase Globally**: We considered keeping global Supabase client mocks. However, this was rejected because it violates the isolation principle of the Repository Pattern, leading to brittle tests when the underlying database schema or implementation changes.

## Consequences
- **Positive**: UI tests become robust, isolated, and accurately reflect application behavior under the new architecture. Prevents cascading failures from structural changes.
- **Negative**: Increased boilerplate when writing UI component tests, as developers must explicitly set up context wrappers and detailed mock data objects.

## Related Notes
- See updated `docs/testing.md` for guidelines on writing tests under this architecture.
- For related setup, refer to `frontend/vitest.setup.ts`.
