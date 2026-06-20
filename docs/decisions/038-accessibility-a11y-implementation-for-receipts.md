# ADR-038: Accessibility (a11y) Implementation for Receipts and Scan Components

## Status
Accepted

## Supersedes
None

## Context
The receipts feature components (ReceiptReviewForm, BankStatementReviewForm, ScanDialog, ScanProgressIndicator) lacked proper accessibility attributes needed for screen readers and automated a11y testing. Missing labels on form inputs, aria attributes on interactive elements, and semantic roles on status/error components made the feature inaccessible and difficult to test with standard accessibility testing tools.

## Decision
Implement comprehensive WCAG-based accessibility attributes across all receipts-related components:

### 1. Form Labels
- Add `<label htmlFor>` elements paired with `id` attributes on all Input components
- Add `aria-label` on `select` elements
- Add `aria-label` on dynamically generated item inputs (product name, price, transaction fields)

### 2. Interactive Elements
- Replace `title` attribute with `aria-label` on icon-only buttons (delete, add item)
- Add `role="button"`, `aria-label`, and `tabIndex` on dropzone div elements
- Add `aria-label` on action buttons (view, edit, delete) in ReceiptList

### 3. Status Regions
- Add `role="status"` and `aria-live="polite"` to scanning progress indicator
- Add `role="progressbar"` with `aria-valuenow` for progress percentage
- Add `role="alert"` and `aria-live="assertive"` to error message container

### 4. E2E Testing
- Update e2e tests to use semantic selectors (`[aria-label]`, `[role]`) instead of CSS selectors
- Add tests verifying accessibility attributes exist

## Alternatives Considered
- **Using aria-labelledby instead of aria-label**: Rejected because labels are already visually present in the UI, and aria-label provides simpler implementation
- **Using HTML `<form>` wrapper**: Not implemented due to existing component structure using div containers

## Consequences
- **Positive**: Screen readers can now properly announce all form fields and interactive elements
- **Positive**: Automated a11y testing tools (axe-core, Lighthouse) can verify proper labeling
- **Positive**: E2E tests use semantic selectors that are more stable and aligned with accessibility
- **Trade-off**: Minor increase in bundle size from additional aria attributes

## Related Notes
- Modified: `features/receipts/components/ReceiptReviewForm.tsx`
- Modified: `features/receipts/components/BankStatementReviewForm.tsx`
- Modified: `features/receipts/components/ScanDialog.tsx`
- Modified: `features/receipts/components/ScanProgressIndicator.tsx`
- Modified: `components/receipts/ReceiptList.tsx`
- Modified: `e2e/test/specs/receipts.e2e.js`
- Tests added in: `features/receipts/__tests__/*.test.tsx`