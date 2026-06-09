# ADR-009: Standardize Date Format and Timezone for OCR Parsing

## Status

Accepted

## Context

During bank statement and receipt parsing, transactions extracted via OCR require a consistent date format to be persisted in the database. Initially, dates were formatted to the local date portion (e.g., `YYYY-MM-DD`) or mapped to a standard UTC representation (`YYYY-MM-DDTHH:mm:ssZ`). 

However, since bank statement transactions in Indonesia typically operate on Western Indonesian Time (WIB) which is GMT+7 (UTC+7), formatting them with the UTC 'Z' designation was technically inaccurate. It represented local transaction times as UTC times, causing a 7-hour discrepancy when parsed and integrated into dashboard charts or query filters.

Furthermore, hardcoding a specific timezone like GMT+7 limits the application's usability if a user operates in a different local timezone (e.g., Central Indonesia Time WITA / GMT+8, Eastern Indonesia Time WIT / GMT+9, or other countries). 

To fix this, we need a mechanism that:
1. Standardizes all dates to ISO8601 instead of ambiguous UTC strings.
2. Dynamically detects and applies the browser's timezone offset during document scanning, fallback to GMT+7 (`+07:00`) for consistency.

## Decision

Standardize the OCR transaction date formatting function to produce ISO8601 compliance by dynamically passing and applying the client browser's timezone offset.

Specifically:
1. **Client-Side Offset Calculation**: Calculate the timezone offset in ISO8601 format (e.g., `+07:00` or `-05:00`) on the client inside [ScanDialog.tsx](file:///d:/01_Projects/fintrack-saas/components/transactions/ScanDialog.tsx) using `new Date().getTimezoneOffset()` and pass it inside the `FormData` to the Server Action.
2. **Server Action Propagation**: Read the `timezoneOffset` parameter inside the `scanDocumentWithAI` Server Action in [ocr.ts](file:///d:/01_Projects/fintrack-saas/lib/actions/ocr.ts), defaulting to `+07:00` if not provided, and propagate it through `documentProcessor.process` to the bank statement parsers.
3. **Utility & Parsers Integration**:
   - Implement `formatISO8601Date` in [utils.ts](file:///d:/01_Projects/fintrack-saas/lib/ocr/utils.ts) to accept an optional `timezoneOffset` parameter (defaulting to `+07:00`).
   - Propagate the optional `timezoneOffset` string through the bank parsers' internal methods (`parse`, `extractDates`, `formatDateLine`, `formatDate`, `buildTransaction`, etc.) down to the date formatting function call.

## Alternatives Considered

1. **Keep UTC (Z) offset**: Keep using `Z` suffix and convert/shift times programmatically on the frontend or backend. Rejected because storing the timezone offset directly in the transaction timestamp is more robust and prevents offset calculation errors in database queries.
2. **Hardcode GMT+7 offset**: Hardcode all offsets to `+07:00`. Rejected because it creates discrepancies for users scanning statements outside the WIB timezone (GMT+7).

## Consequences

### Positive
- **Consistency & Flexibility**: Dynamic timezone matching prevents time-shifting issues for users globally while maintaining standard Indonesian WIB formatting by default.
- **Accurateness**: Represents the actual time of Indonesian and regional bank statements correctly based on browser-side localization.
- **Clean Code**: Replaces all occurrences of `formatRFC3339Date` with `formatISO8601Date` across the codebase.

### Neutral
- Requires passing the timezone offset from the client component to the server actions as a parameter.

## Related Notes

- Client dialog: [ScanDialog.tsx](file:///d:/01_Projects/fintrack-saas/components/transactions/ScanDialog.tsx)
- Server action: [ocr.ts](file:///d:/01_Projects/fintrack-saas/lib/actions/ocr.ts)
- Shared utility function: [utils.ts](file:///d:/01_Projects/fintrack-saas/lib/ocr/utils.ts)
- Bank Parsers:
  - [bsi-parser.ts](file:///d:/01_Projects/fintrack-saas/lib/ocr/banks/bsi-parser.ts)
  - [jago-parser.ts](file:///d:/01_Projects/fintrack-saas/lib/ocr/banks/jago-parser.ts)
  - [seabank-parser.ts](file:///d:/01_Projects/fintrack-saas/lib/ocr/banks/seabank-parser.ts)
