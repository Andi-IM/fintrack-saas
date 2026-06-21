# ADR-044: Build-Time Environment Injection for E2E Fakes and Dynamic Wait Strategies

## Status
Accepted

## Context
When conducting E2E (End-to-End) testing using WebdriverIO against a Next.js App Router application, we encountered several architectural and timing challenges:
1. **Next.js Static Generation vs E2E Mocks**: Our E2E tests need to run against a production build (`next build` followed by `next start`) to ensure accurate performance metrics and reflect the true user experience. However, Next.js statically generates pages during the build process. If we only inject fake repositories (like `FakeCashFlowRepository`) at runtime via middleware or request headers, the static pages will have already been built using the real database layer, causing E2E tests to fail or display incorrect data.
2. **React Hydration and Soft Navigation Race Conditions**: When simulating user actions (such as selecting a filter from a dropdown), Next.js performs a soft navigation (via `nuqs` URL query updates). This triggers an asynchronous React re-render, unmounting and remounting DOM elements. WebdriverIO scripts that relied on hardcoded waits (e.g., `await browser.pause(1000)`) and array iteration over DOM references (e.g., `$$('tr')`) frequently crashed with `Stale Element Reference` exceptions because the elements were detached from the DOM during the React render cycle.

## Decision
To guarantee resilient E2E tests in a Next.js production-build environment, we have adopted the following strategies:
1. **Build-Time Environment Injection**: Inject the `NEXT_PUBLIC_IS_TESTING=true` environment variable explicitly during the `next build` command in our E2E runner script (`run-alternated-tests.js`). This forces the IoC (Inversion of Control) container to bundle and utilize `FakeRepositories` directly into the statically generated pages.
2. **Dynamic DOM Querying for Race Conditions**: 
   - Prohibit the use of hardcoded `browser.pause()` for waiting on React state changes.
   - Mandate the use of dynamic waits, such as `waitForExist()`, directly on the exact target element (e.g., the specific action button, not its parent row).
   - In loops that manipulate the DOM (like iterative row deletions), re-query the elements (Fresh DOM Querying) at the start of every iteration to ensure WebdriverIO always interacts with the most recently mounted DOM nodes, surviving any React unmount/remount cycles.

## Alternatives Considered
- **Runtime Mocking via API/Headers**: Attempting to mock the database at runtime. Rejected because Next.js App Router's aggressive static caching and Server Components make runtime overriding highly unpredictable and complex compared to a clean build-time injection.
- **Polling with Try-Catch**: Using recursive try-catch blocks to handle `Stale Element Reference` errors. Rejected because it leads to bloated test code. Directly querying the fresh elements via WebdriverIO selectors is cleaner and more idiomatic.

## Consequences
- **Positive**: E2E tests can now safely run against a true production build, ensuring high fidelity. Test execution is completely immune to varying React render speeds, eliminating flakiness and false-positive timeouts.
- **Negative**: We must perform a dedicated `next build` specifically for E2E testing. The build artifact generated for E2E cannot be reused for actual production deployment since it contains Fake Repositories.

## Implementation Plan
- **Affected paths**: 
  - `frontend/e2e/scripts/run-alternated-tests.js` (E2E Runner)
  - `frontend/e2e/test/specs/*.e2e.js` (E2E Test Suites)
- **Pattern**: 
  - Prefix `next build` with `NEXT_PUBLIC_IS_TESTING=true` in testing scripts.
  - Replace all `browser.pause()` related to UI transitions with `waitForExist()` and direct `$$()` re-queries.

## Verification
- [x] E2E runner injects the environment variable during build.
- [x] Mock data appears correctly on the initial page load without connecting to a real database.
- [x] Iterative actions (like deleting multiple rows) succeed without throwing `Stale Element Reference` errors.
- [x] All E2E test suites pass successfully.

