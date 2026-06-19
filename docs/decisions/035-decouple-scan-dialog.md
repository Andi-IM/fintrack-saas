# ADR-035: Decouple ScanDialog into Sub-components and Hooks for Testability

## Status
Accepted

## Context
`ScanDialog.tsx` is a monolithic React component (~570 lines) that handles:
1. Dropzone and file upload UI.
2. File validation and compression (image-only, via `compressImageIfNeeded`).
3. Asynchronous execution of AI Document Scanning (via `scanDocumentWithAI`) and simulating progress via `setInterval`.
4. Asynchronous saving of scanned data (via `saveReceipt` / `saveBankStatement`).
5. Complete form-based editing for both Receipt and Bank Statement data models, along with nested item lists.
6. A deep coupling to `useScanStore()` (extracting 14 distinct values and methods).

This makes testing `ScanDialog` extremely difficult and prone to flakiness because:
- Mocking a single interaction requires stubbing many APIs, Zustand state variables, and React Dropzone.
- The use of `setInterval` inside `handleProcessScan` requires mocking timers.
- The logic branches for `'Receipt'` and `'BankStatement'` are mixed together, resulting in high cyclomatic complexity.

## Decision
Refactor `ScanDialog` to separate its concerns into pure utility functions, hooks, and presentation-only components:

1. **Extract API payload mapping logic**:
   - Create `features/receipts/utils/scan-mapper.ts` containing pure functions to map scanned results to API payloads for `saveReceipt` and `saveBankStatement`.
2. **Move Timezone Offset Logic**:
   - Relocate browser timezone offset calculation to `lib/utils/date.ts`.
3. **Extract OCR scanning and timer logic**:
   - Create `features/receipts/hooks/use-ocr-scanner.ts` to manage the OCR scanning execution flow, fake progress updates via timers, and updating the state store.
4. **Decompose the UI component**:
   - Extract the receipt edit UI into a new component `ReceiptReviewForm.tsx`.
   - Extract the bank statement edit UI into a new component `BankStatementReviewForm.tsx`.
   - Keep `ScanDialog.tsx` as a thin coordinator component that manages the dropzone and delegates rendering to the specific review forms once scanning is successful.

## Alternatives Considered
- **Mock everything in a massive integration test**: Rejected because mocking all Zustand variables, Next.js routers, multiple Server Actions, file readers, and the dropzone logic inside a single component test results in flaky, slow, and unmaintainable tests.
- **Split solely into components, keep hooks internal**: Rejected because the complex timer logic and payload transformations would still reside inside components, making it hard to unit test them in isolation.

## Consequences
- **Positive**: Payload mapping functions can be tested via simple unit tests without React rendering.
- **Positive**: UI components (`ReceiptReviewForm`, `BankStatementReviewForm`) will be simple presentational inputs, making them easy to test via simple user events.
- **Positive**: Separates Receipt scanner concerns from Bank Statement scanner concerns, reducing cyclomatic complexity.
- **Trade-off**: Increases the number of files in `features/receipts`.
