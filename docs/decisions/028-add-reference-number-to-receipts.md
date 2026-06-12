# ADR-028: Add Reference Number to Receipts to Link to Bank Statement Items

## Status

Accepted

## Context

Users upload physical receipts (shopping/ATM) and bank statements. Currently, these two data sources are independent. However, ATM receipts and other payment receipts often contain transaction reference numbers (such as "No Referensi", "Ref No", or "Receipt No") that also appear in the bank statement's transaction description or metadata.

To allow matching and reconciling physical receipts with their corresponding bank statement items (reconciliation), we need a database field in the `receipts` table to store this reference number and a direct relationship to the `bank_statement_items` table.

## Decision

We will perform the following changes:
1. **Database Schema Update**:
   - Add a nullable column `reference_number` (TEXT) to the `receipts` table.
   - Add a nullable column `bank_statement_item_id` (UUID) to the `receipts` table, acting as a foreign key referencing `bank_statement_items(id) ON DELETE SET NULL`.
2. **Auto-linking Logic**:
   - When a receipt is created or updated: if `reference_number` is provided, we query `bank_statement_items` to see if there is an item whose description or metadata matches the reference number. If found, we automatically set `bank_statement_item_id`.
3. **OCR Integration**:
   - Enhance the ATM receipt parser (`AtmReceiptParser`) to extract the reference number from the OCR text map using keywords like `'no referensi'`, `'ref no'`, `'no. referensi'`, `'no. ref'`, `'ref. no'`, `'no resi'`, `'resi'`, `'no. resi'`, `'receipt no'`, and populate the `referenceNumber` in `OCRResult`.
4. **UI Updates**:
   - Allow viewing and editing the reference number in the review form (`ScanDialog`), edit form (`ReceiptEditDialog`), and details modal (`ReceiptList`).
   - If `bank_statement_item_id` is linked, display a "Reconciled" badge and the matched bank transaction details (bank name, date, description, amount) under the receipt details modal.

## Alternatives Considered

- **Dynamic String Match Only**: Fetching associated bank statement items dynamically by searching for the reference number in transaction descriptions. Rejected because it is slow, does not scale well, and does not enforce referential integrity or support manual override.
- **Strict Foreign Key without Raw String**: Storing only `bank_statement_item_id` without the raw `reference_number` text. Rejected because if a statement hasn't been uploaded yet, we would lose the extracted reference number from the scanned receipt, preventing future auto-linking when the statement is eventually uploaded.

## Consequences

- **Good**: Clear relational model linking receipts and bank statement items.
- **Good**: OCR automatically extracts reference numbers, reducing manual entry for ATM receipts.
- **Good**: Better UX with reconciliation status feedback and details.
- **Trade-off**: Requires database migration and updating the schema definitions.
