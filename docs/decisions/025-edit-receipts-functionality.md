# ADR-025: Edit Scanned Receipts Functionality

## Status
Proposed

## Context
Scanned receipts are stored in the database under the `receipts` table, and their line items are stored in the `receipts_items` table with a foreign key reference to `receipts`.
Currently, the application allows users to scan and upload receipts, list receipts, view details of each receipt, and delete receipts. However, the system does not support editing receipts. If an OCR parser extracts metadata incorrectly (e.g., wrong store name, misread prices, or incorrect date), the user has no way to correct this data in the database other than deleting and re-uploading, which is a poor user experience.

We need a way for users to edit scanned receipts (metadata and line items) directly from the user interface.

## Decision
We will implement the edit receipts functionality with the following design:

1. **Database Update logic**:
   - Create a server action `updateReceipt(id: string, input: SaveReceiptInput)` in [receipts.ts](file:///d:/01_Projects/fintrack-saas/frontend/lib/actions/receipts.ts).
   - In a single database operation sequence:
     1. Update the parent receipt record in the `receipts` table.
     2. If the receipt type is `shopping`, delete all existing items in `receipts_items` where `receipt_id` matches the receipt ID.
     3. Insert the new/modified list of items into the `receipts_items` table.
     4. Trigger next/navigation cache revalidation (`revalidatePath('/receipts')`).

2. **User Interface Interaction**:
   - Modify the details modal in `ReceiptList.tsx` to include an **Edit Struk** (Edit Receipt) button in the footer.
   - Create a reusable `ReceiptEditDialog.tsx` component that accepts the selected receipt and a success callback.
   - The edit modal will use React Hook Form for form state and validation, styling matched to our existing premium design system.
   - For `shopping` receipts, the form will allow users to dynamically add, edit, and delete line items using `useFieldArray`.
   - Form fields will have clean input fields, tooltips, and real-time total price summation based on the sum of line items.

## Alternatives Considered
- **Direct inline editing in the details view**: Considered making the details view fields double-clickable to edit inline. However, this is harder to validate as a cohesive transaction (especially when modifying multiple items and totals), and can lead to partial-state database updates.
- **Complex item diffing**: Updating `receipts_items` by comparing which ones were added, modified, or deleted. This would require tracking database IDs for each item, which increases form complexity. Deleting and re-inserting all items for the edited receipt is simpler, cleaner, and extremely robust for the current scale.

## Consequences
- **Positives**:
  - Direct, simple, and reliable way for users to correct OCR mistakes.
  - Reuses existing validation schemas and Zod models from `receipts.ts`.
  - Transaction-safe updates using standard Supabase client queries.
- **Negatives**:
  - Re-inserting items generates new UUID primary keys for items. If external models reference `receipts_items.id`, they would break; however, currently, there are no references to individual receipt items, only to the parent `receipts.id`.
