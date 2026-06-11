# ADR-027: Mina Swalayan Parser — OCR Misread Handling and Merchant Normalization

## Status

Accepted

## Supersedes

Extends ADR-024 (Abstract Receipt Parser Using Strategy Pattern)

## Context

The `MinaSwalayanReceiptParser` added in ADR-024 handles receipts from the Mina Swalayan Besi Jangkang store in Yogyakarta. Production OCR runs revealed two categories of failure:

### 1. OCR Store Header Misread

The store's header/logo is frequently misread by Google Cloud Vision OCR. Common misreadings include:
- `ATHA SHALAYAN RESI JH` (instead of `MINA SWALAYAN BESI JANGKANG`)
- `ATHA SWALAYAN` variants

Since the parser's `identify()` method only checked for `mina swalayan` or `mina` + `besi/jangkang`, misread receipts fell through to the generic `ShoppingReceiptParser`. That parser's Format B regex (`/^(\d+)\s+([A-Za-z].{2,})$/`) matched quantity lines like `1 PCS` as qty=1, name="PCS", producing corrupt items.

### 2. Non-Standard Quantity Separators

The receipt format uses horizontal spacing:
```
BANTENG LILIN B
8.800
2.PCS
17.600
```

The parser's qty regex `/^(\d+)\s*(PCS|...)?$/i` did not match `2.PCS` (dot separator), causing the item to be silently dropped.

### 3. Undeclared Variable

The `paymentMethod` variable was referenced in `buildReceiptResult()` options at line 175 but never declared, causing a `ReferenceError` at runtime.

## Decision

### 1. Expand `identify()` for OCR Misreads

Add recognition patterns for known OCR misreadings of the store header:

```typescript
textLower.includes('atha swalayan') ||
textLower.includes('atha shalayan') ||
textLower.includes('atha') && textLower.includes('resi jh')
```

### 2. Merchant Normalization

When the identified store matches an OCR misread pattern, override the merchant name to the canonical value:

```typescript
if (/atha\s*(?:shalayan|swalayan)/i.test(merchant) || /resi\s*jh/i.test(merchant)) {
  merchant = 'MINA SWALAYAN BESI JANGKANG'
}
```

### 3. Handle Non-Standard Qty Separators

Add an alternative regex branch for the dot-separator format:

```typescript
const qtyMatch = line.match(/^(\d+)\s*(?:PCS|...)?$/i) ||
                 line.match(/^(\d+)\.(?:PCS|...)$/i)
```

## Alternatives Considered

1. **Fix OCR source**: Rejected — Google Cloud Vision's reading of stylized logos is outside our control.
2. **Train a custom OCR model**: Not proportionate for a single store's header.
3. **Soft-match merchant in downstream code**: Rejected — the parser should produce correct data at parse time.

## Consequences

### Positive

- Receipts with misread headers now route to the correct parser instead of the generic fallback.
- Merchant name in the UI is always the canonical `MINA SWALAYAN BESI JANGKANG`.
- Items with `2.PCS` separator no longer silently dropped.
- Declared variable prevents `ReferenceError` crash.

### Risks

- New `identify()` patterns are heuristic — future OCR misreadings of other stores could false-positive match. Any new parser checking for unrelated `atha` text (e.g., a pharmacy receipt mentioning "athame") would need to be registered before `MinaSwalayanReceiptParser` in the chain.

## Related Notes

- ADR-024: Abstract Receipt Parser Using Strategy Pattern
- `lib/ocr/receipts/mina-parser.ts` — all changes isolated to this file
