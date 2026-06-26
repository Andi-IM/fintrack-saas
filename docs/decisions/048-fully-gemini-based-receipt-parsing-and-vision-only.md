# ADR-048: Fully Gemini-Based Receipt Parsing and Google AI Vision Only

## Status

Accepted

## Supersedes

Extends ADR-008 (Adopt Strategy Pattern for OCR and Parsing) and ADR-024 (Abstract Receipt Parser Using Strategy Pattern)

## Context

The previous receipt OCR pipeline relied on multiple OCR engines (Google Cloud Vision, Doctr, and OCR.space) for raw text extraction and a rule-based Strategy Pattern (e.g., `AtmReceiptParser`, `AciakMartReceiptParser`, `CitraSwalayanReceiptParser`, `MinaSwalayanReceiptParser`, `RaudhahSwalayanReceiptParser`, `ShoppingReceiptParser`) for parsing the extracted text into structured financial transactions.

While rule-based parsing is fast, it is:
1. **Fragile**: Highly sensitive to minor OCR character misreadings or layout shifts.
2. **Difficult to Scale**: Adding new merchants requires writing new regex parsers for each, leading to code bloat and maintenance overhead.
3. **Redundant**: The system already includes `GeminiReceiptParser` as a fallback, but it was not fully integrated into the critical pathway.

Additionally, maintaining three separate OCR extractors (`DoctrOcrExtractor`, `OcrSpaceExtractor`, `VisionExtractor`) adds unnecessary operational complexity and increases latency when failing over between engines.

## Decision

We will:
1. Migrate the receipt parsing process to use **Gemini AI exclusively** (`GeminiReceiptParser`). All other rule-based receipt parsers will be unregistered from the processor registry.
2. Restrict the OCR text extraction phase to **Google AI Vision only** (`VisionExtractor`). The `DoctrOcrExtractor` and `OcrSpaceExtractor` will be unregistered.
3. Extend the schema of `GeminiReceiptParser` to capture store addresses, and ATM receipt properties (`atmId`, `transactionType`, `fee`, `referenceNumber`).
4. Implement post-processing in `GeminiReceiptParser` to format ATM receipts with a fallback line item (mimicking the legacy ATM parser behavior).

### Architecture

```
lib/ocr/processor.ts                  # Registers extractors and parsers
  ├── lib/ocr/vision.ts               # Sole registered IExtractor (Google AI Vision)
  └── lib/ocr/receipt-parser.ts       # Receipt IParser
        └── lib/ocr/gemini-parser.ts  # Sole registered IReceiptParser (Gemini AI)
```

## Alternatives Considered

1. **Keep rule-based parsers and only use Gemini as fallback (Status Quo)**: Rejected because it does not solve the maintenance overhead of writing regexes for new merchants.
2. **Hybrid approach (Rule-based first, then Gemini)**: Rejected because it still requires maintaining specialized rule classes and leads to inconsistent extraction quality.
3. **Use Gemini for both OCR and Parsing directly (Multimodal)**: Kept the separation where Google Vision extracts the text first and Gemini parses the text, as this keeps the flow consistent with the bank statement parsing pipeline.

## Consequences

### Positive
* **Simplicity**: Decreases codebase size and maintenance complexity by eliminating regex parsing logic.
* **Accuracy**: LLMs handle OCR noise, spelling variations, and different receipt layouts much better than static regex rules.
* **Consistency**: ATM receipts, grocery receipts, restaurant bills, and other formats are handled uniformly.
* **Pipeline Speed**: Standardizing on Google AI Vision reduces latency overhead from failing over to slower/external OCR services.

### Risks
* **Cost & API rate limits**: Gemini API is billed per token. This increases overall api usage, but given the current SaaS scale, this is well within acceptable limits.
* **Network dependency**: Receipt parsing now strictly requires Gemini API availability.

## Related Notes

* [ADR-008: Adopt Strategy Pattern for OCR and Parsing](./008-adopt-strategy-pattern-for-ocr-and-parsing.md)
* [ADR-024: Abstract Receipt Parser Using Strategy Pattern](./024-abstract-receipt-parser-strategy-pattern.md)
