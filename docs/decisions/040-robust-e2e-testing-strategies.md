# ADR-040: Robust E2E Testing Strategies and Stateful Fakes

## Status
Accepted

## Context
When conducting E2E (End-to-End) testing using WebdriverIO for the Receipts feature, several challenges arose regarding test reliability, element visibility, and state management in a Next.js Server Actions environment:
1. **Hidden Elements (React Dropzone):** The `react-dropzone` component inherently hides the `<input type="file">` element, causing WebdriverIO's `setValue` to throw "no such element" or fail the file injection process.
2. **Stateless Mocks:** The previous mock repository implementation instantiated a new `MockReceiptRepository` on every request. Due to the nature of Next.js Server Actions and re-renders, the in-memory array reset frequently. Consequently, operations like deletion failed to persist in the UI during tests.
3. **Negative Polling Inefficiencies:** Tests utilized negative assertions (`!(await $('element').isExisting())`) to verify deletions. This triggered repeated `no such element` errors at the browser driver level, wasting computational resources, cluttering logs, and causing false-positive timeouts when dynamic row counts were involved.

## Decision
To ensure resilient, efficient, and 100% reliable E2E tests, the following strategies have been adopted:
1. **Stateful Fake Repositories:** Convert mock repositories into global Singleton objects (e.g., `const fakeReceiptRepository = new MockReceiptRepository()`) during E2E setup. This ensures the mock acts as a true "Fake" in-memory database, persisting state across Next.js API requests and server renders throughout the test lifecycle.
2. **React Dropzone Bypass:** Use `waitForExist` and explicitly override the CSS `display` and `visibility` properties via `browser.execute` to reliably inject files into hidden Dropzone inputs.
3. **Positive Assertions & Global Exclusions:** 
   - Replace negative polling with Positive Assertions (e.g., waiting for Empty State UI components like "Tidak ada struk yang ditemukan.") for O(1) efficiency.
   - Use array lookups (`$$`) to determine element counts without throwing internal driver exceptions.
   - Globally exclude `**/*e2e*.ts` files in the `vitest.config.ts` configuration to maintain 100% clean unit test coverage without manual file-by-file exclusion.

## Alternatives Considered
- **Direct DB Testing:** Using a real testing database instead of Fake Repositories. Rejected because Fake in-memory databases provide faster feedback loops and avoid the overhead of spinning up databases in CI pipelines solely for UI interactions.
- **Custom E2E API Routes:** Creating specific API routes to wipe and seed data. Rejected because keeping the logic encapsulated within a global Fake Repository instance is sufficient for the Next.js process running the tests.

## Consequences
- **Positive:** E2E tests are significantly faster, fully pass without flakiness, and correctly reflect standard user behaviors. Vitest coverage metrics remain pristine.
- **Negative:** Fakes must closely mirror production behaviors; if the production repository adds complex relational constraints, the Fake must be updated to simulate them.

## Related Notes
- Implemented in `features/receipts/actions/e2e-setup.ts`
- Applied in `e2e/test/specs/receipts.e2e.js`
- Coverage rules configured in `vitest.config.ts`

