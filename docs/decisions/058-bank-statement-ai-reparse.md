# ADR-058: Bank Statement AI Reparse from OCR Text

## Status
Accepted

## Context
Users need a way to improve a bank statement scan when the OCR extraction from Modal/docTR is usable but the structured JSON parsing is wrong. Re-uploading the same PDF and running OCR again repeats the expensive extraction step and gives the parser no visibility into the previous structured result that needs correction.

## Decision
Store the raw OCR text returned by the document extractor on the in-memory scan result and add a bank-statement-only reparse path that sends both the raw OCR text and the current parsed JSON back to the OpenAI-compatible parser.

The reparse prompt asks the parser to compare the OCR text against the existing JSON, preserve correct fields, and correct missing or inaccurate values. It does not re-run Modal/docTR OCR and does not persist the raw OCR text to the database.

## Alternatives Considered
Re-run the uploaded file through OCR. Rejected because it repeats extraction work and does not directly address parser mistakes.

Let users manually edit all mistakes. Rejected because it shifts too much correction work to users when the raw OCR text already contains evidence that can improve parsing.

Store OCR text permanently with the statement record. Rejected for now because the immediate need is review-time correction, and the raw text may contain sensitive financial details that do not need long-term persistence.

## Consequences
Positive: Reparse is faster and cheaper than full OCR because it skips file extraction.

Positive: The AI receives both source evidence and its previous structured output, making targeted correction more likely.

Trade-off: Reparse is only available while the scan result remains in client state. Refreshing the page or discarding the scan removes the raw OCR context.

Risk: Raw OCR text is exposed to the client during review. This matches the review workflow but should not be persisted unless a future ADR covers retention and privacy.

## Related Notes
Frontend actions: `frontend/features/receipts/actions/ocr.ts`

OpenAI-compatible parser: `frontend/lib/ocr/openai-parser.ts`

Document processor: `frontend/lib/ocr/processor.ts`
