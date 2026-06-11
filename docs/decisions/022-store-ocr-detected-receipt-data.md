# ADR-022: Store OCR-Detected Receipt Data in Receipts and Receipts Items Tables

## Status

Accepted

## Context

Previously, the `ScanDialog.tsx` component saved scanned receipts as generic transactions in the `transactions` table, storing the list of purchased products as a raw JSON array. Following the creation of the normalized `receipts` and `receipts_items` database schema (documented in [ADR-021](file:///D:/01_Projects/fintrack-saas/docs/decisions/021-add-receipts-and-items-schema.md)), we need to:
1. Extend the OCR parser to extract the new attributes (address, transaction date, payment method, cash paid, change, quantity, and unit price).
2. Create a Server Action to save this normalized data.
3. Update the scan dialog to use the new action and map the fields correctly.

## Decision

We will implement the following changes:

1. **Extend OCR Interfaces and Parser**:
   - Update `frontend/lib/ocr/types.ts` to include optional attributes (`address`, `date`, `paymentMethod`, `amountPaid`, `change` for `OCRResult`, and `quantity`, `price` for `ReceiptItem`).
   - Enhance `ReceiptParser.parse()` in `frontend/lib/ocr/receipt-parser.ts` to attempt extracting store address, transaction timestamp, payment method, cash paid, and change via regex matching from raw OCR text. Populate item quantities and prices during line-item extraction.

2. **Add Server Action**:
   - Create `frontend/lib/actions/receipts.ts` to expose the `saveReceipt()` server action. It validates input using Zod and inserts records into both `receipts` and `receipts_items` tables (linked by foreign key, with automatic cascading deletion on database level).

3. **Integrate with UI**:
   - Modify `frontend/components/transactions/ScanDialog.tsx` to import `saveReceipt()` and replace the `insertTransaction()` call under the `Receipt` scan context. Map the OCR result properties (`storeName`, `storeAddress`, `date`, `totalPrice`, `paymentMethod`, `amountPaid`, `change`, and `items`) to match the new server action input.

## Alternatives Considered

- **Keeping OCR items flat without quantities/prices**: Rejected. The receipt OCR frequently returns lines like `Product A 10.000 x 2`, and storing this raw detail in normalized columns (`quantity` and `price`) is highly beneficial for future inventory and budgeting features.

## Consequences

- **Good**: Receipt data scanned via OCR is stored in a clean, queryable relational format, aligned with the database schema.
- **Good**: Better fallback handling when specific fields (like date or address) are missing from the OCR text (defaults to current date and default cash payment).
- **Good**: Retains type-safety and builds successfully.
