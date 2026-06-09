# ADR-010: Support BNI Bank Statement Parsing

## Status

Accepted

## Context

The system supports bank statement OCR parsing for SeaBank, Bank JAGO, and BSI. However, users uploading BNI (Bank Negara Indonesia) statements could not get their transactions parsed because there was no dedicated BNI parser in the registry. BNI statements would fall back to the generic/BSI parser which failed to extract transactions due to differing headers, date formats, and layout structures.

To support BNI statements, we need a parser that can:
1. **Identify** BNI statements.
2. Handle **both US and Indonesian amount formats** (since BNI statements utilize US decimal dot and thousands comma format, unlike other banks).
3. Handle **duplicate/empty transaction date columns** (consecutive transactions on the same day leave the date cell empty).
4. Parse **Markdown tables** (e.g. from OCR.space) and **vertical unstructured text layouts** (from Google Vision OCR) correctly.

## Decision

Implement and register a new `BniParser` strategy in `lib/ocr/banks/bni-parser.ts` to support BNI statements.

Key implementation details:
1. **Identification**: Match keywords like `BNI`, `TAPLUS`, `URAIAN MUTASI`, and `TGL. TRANS`.
2. **Dynamic Period Extraction**: Support BNI's date range format (e.g., `01/12/2025 S/D 31/12/2025`) and map numeric months to uppercase abbreviations (e.g. `DES 2025`).
3. **Robust Amount Parsing**: Implement `parseBniAmount` to support US number format `1,000.00` and Indonesian number format `1.000,00` seamlessly.
4. **Markdown Table Parsing**: Iterate row-by-row and parse cells dynamically based on their relative indices (Date, Description, Debit, Kredit, Saldo), carrying over dates for empty rows.
5. **Vision Column Block Parser**: Reconstruct dates, amounts, and transaction descriptions from unstructured blocks by identifying dates, amount directions (`D`/`K`), and using heuristic amount-based matching for descriptions to avoid OCR segmentation errors.

## Alternatives Considered

1. **Extend BsiParser with BNI keywords**: Rejected because the table structure, column indices, date formats, and amount directions (`D`/`K` suffix) are specific to BNI, and adding them to BsiParser would violate the Single Responsibility Principle.
2. **Strict index mapping for Vision layout**: Mapping dates, descriptions, and amounts strictly by index. Rejected because Google Vision reads columns vertically and splits descriptions into fragments, leading to misalignments. The amount-based heuristic matching is far more robust.

## Consequences

### Positive
- **New Bank Supported**: BNI statement imports are fully supported.
- **Robustness**: The parser handles both high-quality PDF imports (Markdown tables) and photo uploads (Google Vision) correctly.
- **Accurateness**: Cleaned descriptions and correct amount types (Debit as expense, Kredit as income) are populated in the UI.

## Related Notes

- Parser file: [bni-parser.ts](file:///d:/01_Projects/fintrack-saas/lib/ocr/banks/bni-parser.ts)
- Registry files:
  - [bank-statement-parser.ts](file:///d:/01_Projects/fintrack-saas/lib/ocr/bank-statement-parser.ts)
  - [processor.ts](file:///d:/01_Projects/fintrack-saas/lib/ocr/processor.ts)
