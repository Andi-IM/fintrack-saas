# ADR-008: Adopt Strategy Pattern for OCR and Parsing

## Status

Accepted

## Context

The implementation of receipt and bank statement OCR in `lib/actions/ocr.ts` was modularized but remained **tightly coupled**. The core server action `scanDocumentWithAI` had direct dependencies on specific OCR providers (Google Vision, OCR.space) and specific parsing logic (Receipt, Bank Statement). This made the system difficult to extend (e.g., adding a new bank or a different OCR provider) without modifying the central coordinator code, violating the Open/Closed Principle.

Additionally, the initial refactored `BankStatementParser` contained the parsing logic for all bank formats (SeaBank, Jago, BSI) inlined in a single 629-line method, violating the DRY (Don't Repeat Yourself) principle — bank-specific parsers existed in `lib/ocr/banks/` but were never imported or used.

## Decision

Adopt the **Strategy Pattern with a Registry** to decouple OCR extraction, document parsing, and bank-specific parsing. The registry selects and delegates to the appropriate strategy implementation at runtime.

### Architecture

```
lib/actions/ocr.ts                     # Thin server action, delegates to DocumentProcessor
  └── lib/ocr/processor.ts             # Registry: registers extractors & parsers
        ├── lib/ocr/vision.ts          # IExtractor — Google Cloud Vision (images)
        ├── lib/ocr/ocr-space.ts       # IExtractor — OCR.space (PDFs)
        ├── lib/ocr/receipt-parser.ts  # IParser — Receipts
        └── lib/ocr/bank-statement-parser.ts  # IParser — delegates to IBankParser[]
              ├── lib/ocr/banks/seabank-parser.ts  # IBankParser — SeaBank
              ├── lib/ocr/banks/jago-parser.ts     # IBankParser — Bank JAGO
              └── lib/ocr/banks/bsi-parser.ts      # IBankParser — BSI (also acts as fallback)
```

### Interfaces (`lib/ocr/interfaces.ts`)

- `IExtractor` — handles raw file conversion to text
- `IParser` — handles text conversion to `OCRResult` for a given context (`Receipt` | `BankStatement`)
- `IBankParser` — handles bank-specific identification (`identify()`) and parsing (`parse()`)

### Shared Utilities (`lib/ocr/utils.ts`)

Common parsing logic extracted to prevent duplication:

| Function | Purpose |
|---|---|
| `sliceColumns()` | Slice column sections from table-structured text |
| `normalizeOcrDigit()` | Correct common OCR misreads (g→9, s→5, l→1, o→0) |
| `splitIntoPages()` | Split multi-page OCR text |
| `splitIntoLines()` | Split text into trimmed, non-empty lines |
| `buildBankResult()` | Build standardized `OCRResult` for bank parsers |
| `parseStatementPeriod()` | Extract statement period from text |
| `formatTransactionDate()` | Format date components into ISO string |
| `classifyCategory()` | Categorize transaction by keyword patterns |
| `sanitizeTransactionName()` | Clean transaction description |
| `parseIndonesianAmount()` | Parse Indonesian number format to integer |
| `cleanAndNormalizeAmount()` | Normalize amount string (OCR fix, whitespace) |

### Bank-Specific Parsers (`lib/ocr/banks/`)

Each bank parser implements `IBankParser` with small, focused private helper methods, ensuring readability and single responsibility:

| Class | File | Private Methods | Responsibility |
|---|---|---|---|
| `SeabankParser` | `seabank-parser.ts` | 10 methods | Parse SeaBank statement tables (column-based) |
| `JagoParser` | `jago-parser.ts` | 7 methods | Parse Bank JAGO statements (column-based) |
| `BsiParser` | `bsi-parser.ts` | 18 methods | Parse BSI statements: column layout & row-by-row fallback |

## Alternatives Considered

1. **Direct Modularization**: Functions separated into files but imported and called directly with `if/else` logic. Rejected because it violates Open/Closed Principle and duplicates bank-specific parsing logic.
2. **Strategy Pattern with Registry (Chosen)**: Maximum decoupling, aligns with enterprise software patterns, supports DRY through shared utilities.
3. **Separate Parser Per Bank + Fallback**: The chosen approach, extended with a fallback mechanism where the last parser in the registry handles unidentifiable bank statements.

## Consequences

### Positive

- **Extensibility**: New banks or OCR providers require only a new class implementing `IBankParser` or `IExtractor` — no changes to existing code.
- **DRY Compliance**: Shared parsing logic (date formatting, category classification, amount parsing, column slicing) lives in `utils.ts`, not duplicated across parsers.
- **Readability**: `BankStatementParser` shrank from ~629 to ~14 lines of logic. Each bank parser has at most ~30 lines per method with a single clear responsibility.
- **Type Safety**: All strategies implement TypeScript interfaces, eliminating `any` casts.
- **Testability**: Extractors and parsers accept plain inputs/outputs and can be mocked independently.

### Neutral

- More files and slightly more boilerplate (interfaces, registry setup, private methods) compared to a monolithic approach.

### Risks

- OCR character normalization (`normalizeOcrDigit`) is heuristic — may need adjustment for different OCR providers.
- BSI parser's dual layout detection (column vs row) adds complexity but is necessary to handle real-world statement variations.

## Verification

- [x] `lib/actions/ocr.ts` contains no direct imports of extractors or parsers — only imports `OCRResult` type and `documentProcessor`.
- [x] `BankStatementParser` no longer contains inlined bank logic — delegates entirely to `IBankParser[]` implementations.
- [x] Bank-specific parsers in `lib/ocr/banks/` are imported and used (no dead code).
- [x] Shared utilities in `utils.ts` are used across multiple bank parsers (no duplication).
- [x] TypeScript compiler passes without errors.
- [x] Document processing works for images (Google Vision) and PDFs (OCR.space).
- [x] Parsing handles SeaBank, Bank JAGO, and BSI statements (column and row layouts).
