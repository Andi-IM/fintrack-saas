# ADR-054: Orchestrator Fallback Mechanism for Bank Statement OCR

## Status
Accepted

## Context
When processing bank statements, the `DocumentProcessor` orchestrates parsing by delegating the OCR text to bank-specific parsers (like `BsiParser`, `JagoParser`) which rely heavily on Regular Expressions and structured string matching.

However, the current OCR engine (`VisionExtractor`) often outputs plain text blocks rather than nicely formatted tables. As a result, the structured Regex parsers (like `BsiParser`) successfully identify the bank from keywords but completely fail to extract any transactions (returning 0 items). Because there was no fallback, the application would simply return an empty result to the user.

## Decision
We decided to implement a **Robust Fallback Mechanism** in the `BankStatementParser` orchestrator. 
If a bank-specific Regex parser identifies the document but fails to extract any valid transaction items (returns an empty array or throws an error), the orchestrator will catch the failure, log a warning, and immediately fall back to the next parser in the chain.

We also registered `OpenAIBankStatementParser` (our 70B LLM-based parser) at the very end of the parser chain. 

## Alternatives Considered
- **Updating the Regex in all legacy parsers**: Rejected. Maintaining Regex for unpredictable layout variations from Google Cloud Vision OCR is unsustainable and brittle.
- **Removing legacy parsers entirely**: Rejected. When they work (e.g., on specific PDF structures), they are extremely fast and cost nothing. They serve as a good first line of defense.

## Consequences
- **Positive**: The system is significantly more robust. If a specific bank format breaks the legacy parser, the AI automatically kicks in and parses the data correctly using LLM contextual understanding.
- **Trade-offs**: Processing time may increase when fallback occurs (from ~100ms for Regex to ~3-5 seconds for LLM), but this is an acceptable tradeoff for accuracy over empty results.
- **Risks**: Increased API usage on Groq/OpenAI endpoints if legacy parsers fail frequently. 

## Related Notes
- See `frontend/lib/ocr/processor.ts` for registration.
- See `frontend/lib/ocr/bank-statement-parser.ts` for the try-catch fallback loop.
