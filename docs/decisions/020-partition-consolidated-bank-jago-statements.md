# ADR-020: Partition Consolidated Bank Jago Statements by Month in Database

## Status

Accepted

## Context

Previously, the uploaded Bank Jago statement files (such as `bank-jago-kartu-bayar-online/1781068261055-l9i8rd2.pdf` and `bank-jago-kantong-utama/1781068325624-eiq1e92.pdf`) consolidated all transactions from multiple months/years into single giant statements in the database (`864d79e4-3748-4afa-8e9f-cf971fd662d8` for Kartu Bayar Online and `4e4d3f16-6762-449f-8761-45d405b18bc4` for Kantong Utama).

This caused several issues:
1. Chronology and sorting bugs in statement analytics and transaction history.
2. Inaccurate running balance calculations since all items were under a single statement period.
3. Buggy behavior in the "View PDF" feature if the giant files were processed as a single entity without proper monthly bounds.
4. Correcting or editing a transaction item affected the entire multi-year statement's running balance recalculation rather than a single month.

To resolve these issues, we need to partition the consolidated transaction items and statements into individual monthly statements in the database, while keeping the original file paths so that the "View PDF" feature continues to function without needing to split the actual PDF files on disk.

## Decision

Execute a database migration to:
1. Delete the two consolidated statements and all their associated transaction items.
2. Insert 38 split monthly statement blocks (28 for "Bank JAGO - Kartu Bayar Online" and 10 for "Bank JAGO - Kantong Utama") corresponding to the transaction items grouped by their calendar months.
3. Keep the exact same `file_path` for all partitioned statements (`bank-jago-kartu-bayar-online/1781068261055-l9i8rd2.pdf` and `bank-jago-kantong-utama/1781068325624-eiq1e92.pdf`). This allows the existing PDF viewer to retrieve the same original uploaded file for any of the monthly split views.
4. Calculate and set the correct `opening_balance`, `closing_balance`, and running `balance` for each partition and transaction item based on the historical chronological sequence of transactions.

The migration is written as a SQL script (`scratch/migrate_monthly.sql`) and executed directly via the database interface.

## Alternatives Considered

- **Splitting the physical PDF files into separate monthly PDFs**: Rejected. This would require complex server-side PDF manipulation library dependencies, re-uploading files, and potential OCR re-processing overhead, which is prone to error and unnecessary since the user only needs the transaction representation and analytics in the UI to be split.
- **Filtering by month dynamically on the frontend while keeping a single statement in the DB**: Rejected. This does not fix the database representation, which stores opening/closing balances at the statement level. Having a single statement with one set of opening/closing balances spanning multiple years makes database-level aggregations and simple queries incorrect.

## Consequences

- **Good**: Balance history, net worth, and monthly financial analytics charts now render correctly with accurate monthly increments.
- **Good**: Users can edit statement transaction items on a per-month basis, with recalculations bounded within that specific month.
- **Good**: "View PDF" feature continues to function seamlessly, pointing to the original uploaded files for all partitioned statements.
- **Good**: Cleans up corrupted data caused by missing/abbreviated month name parsing (e.g. Indonesian `'agt'` parsing bug).
- **Bad**: Replaces the primary keys (`id`) of the original statements, which means any external bookmarks or specific caches referencing the old UUIDs will be invalidated (not an issue for this application's scope).
- **Trade-off**: When viewing the PDF from any of the monthly statements, the user sees the entire multi-month PDF document instead of just that month's pages. This is a reasonable trade-off to keep implementation simple and avoid modifying stored files.

## Related Notes

- The database migration script is saved at `D:/01_Projects/fintrack-saas/scratch/migrate_monthly.sql`.
- Previous bug fixes in `frontend/lib/constants/ocr.ts` (adding Indonesian `'agt'` map) ensure that new Jago statement uploads will not suffer from similar month-parsing issues.
