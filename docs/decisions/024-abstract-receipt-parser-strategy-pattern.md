# ADR-024: Abstract Receipt Parser Using Strategy Pattern

## Status

Accepted

## Supersedes

Extends ADR-008 (Adopt Strategy Pattern for OCR and Parsing) and ADR-023 (Add ATM Receipts Support)

## Context

The `ReceiptParser` class was a 243-line monolith handling both shopping receipts and ATM receipts in a single `parse()` method. ATM detection logic was tacked on at lines 198-224 as a post-processing step, resulting in:

- **Violation of Open/Closed Principle**: Adding new receipt types (e.g., restaurant, gas station, parking) would require modifying the existing class.
- **Violation of Single Responsibility**: One class handled merchant extraction, item parsing, ATM detection, date extraction, payment method detection, and more.
- **Architectural inconsistency**: Bank statements already follow the Strategy Pattern via `BankStatementParser` → `IBankParser[]` (as established in ADR-008), but receipts did not.

## Decision

Apply the same Strategy Pattern abstraction used for bank statements to receipt parsing, creating an `IReceiptParser` interface and splitting the monolithic parser into focused, receipt-type-specific parsers.

### Architecture

```
lib/ocr/receipt-parser.ts              # Thin delegator (IParser), ~30 lines
  ├── lib/ocr/receipts/atm-parser.ts       # IReceiptParser — ATM receipts
  └── lib/ocr/receipts/shopping-parser.ts  # IReceiptParser — Shopping receipts (fallback)
```

### Interface (`lib/ocr/interfaces.ts`)

```typescript
export interface IReceiptParser {
  identify(text: string): boolean
  receiptName: string
  parse(text: string, timezoneOffset?: string, filename?: string): OCRResult
}
```

### Shared Utilities (`lib/ocr/utils.ts`)

Common receipt parsing logic extracted to prevent duplication across receipt parsers:

| Function | Purpose |
|---|---|
| `extractReceiptDate()` | Parse date/time from receipt text, return ISO string |
| `extractReceiptMerchant()` | Extract merchant from first non-empty line |
| `buildReceiptResult()` | Build standardized `OCRResult` for receipt parsers |

### Receipt-Type Parsers (`lib/ocr/receipts/`)

| Class | File | Responsibility |
|---|---|---|
| `AtmReceiptParser` | `atm-parser.ts` | Identify and parse ATM withdrawal/deposit/transfer receipts |
| `ShoppingReceiptParser` | `shopping-parser.ts` | Fallback parser for shopping/store receipts |

### Parser Registration Order

`AtmReceiptParser` is registered **before** `ShoppingReceiptParser` because Shopping is the fallback (always returns `true` from `identify()`). More specific parsers must come first, matching the bank parser precedence model.

## Alternatives Considered

1. **Keep monolith with if/else**: Continue adding receipt type detection with `if/else` blocks in a single class. Rejected because it violates Open/Closed Principle and will grow linearly with each new receipt type.

2. **Abstract base class**: Create an abstract `BaseReceiptParser` with shared methods and subclass it. Rejected because composition (interface + utility functions) is more flexible and aligns with the existing bank parser pattern.

3. **Strategy Pattern with interface + shared utils (Chosen)**: Mirrors the battle-tested `IBankParser` pattern exactly, maximizing consistency and developer familiarity.

## Consequences

### Positive

- **Extensibility**: New receipt types (restaurant, parking, gas station) require only a new `IReceiptParser` implementation — no changes to existing code.
- **Consistency**: Receipt and bank statement parsing now follow the same architectural pattern.
- **DRY Compliance**: Shared receipt logic (date extraction, merchant detection, result building) lives in `utils.ts`.
- **Readability**: `ReceiptParser` shrank from 243 lines to ~30 lines. Each receipt parser has a single clear responsibility.
- **Type Safety**: All strategies implement the `IReceiptParser` interface.

### Neutral

- Two new files (`atm-parser.ts`, `shopping-parser.ts`) and one new directory (`receipts/`).

### Risks

- ATM receipt identification uses specific keywords (`penarikan tunai`, `setoran tunai`, `struk transaksi`, etc.) — receipts from banks using different terminology may need keyword updates.
- The bare keyword `transfer` was intentionally removed from the ATM `identify()` regex to avoid false positives with shopping receipts that mention transfer payments.

## Related Notes

- [ADR-008: Adopt Strategy Pattern for OCR and Parsing](./008-adopt-strategy-pattern-for-ocr-and-parsing.md)
- [ADR-023: Add ATM Receipts Support](./023-add-atm-receipts-support.md)
- `lib/ocr/interfaces.ts` — `IReceiptParser` interface definition
- `lib/ocr/receipts/` — Receipt-type-specific parser implementations
