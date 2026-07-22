# ADR-059: Add Mistral Fallback for OpenAI-Compatible OCR Parsing

## Status

Accepted

## Context

The OCR parsing pipeline currently relies on the OpenAI-compatible parser implemented in `frontend/lib/ocr/openai-parser.ts`, with Groq as the only configured LLM provider.

This works well in the common path, but transient Groq failures, missing `GROQ_API_KEY` configuration, provider-side rate limits, or malformed JSON responses can cause receipt and bank statement parsing to fail entirely even when the OCR text is already available.

The project already uses fallback patterns in the OCR orchestration layer for bank statements, and `frontend/.env.example` already reserves a `MISTRAL_API_KEY` entry. We need a second OpenAI-compatible provider that can take over automatically when Groq cannot complete the parsing step.

## Decision

We will keep Groq as the primary OpenAI-compatible parsing provider and add Mistral as an in-parser fallback provider.

The parser will:
1. Try Groq first using `GROQ_API_KEY`, `https://api.groq.com/openai/v1`, and the existing Groq model.
2. On any Groq processing failure, log the error with `console.error` and retry the same parsing request against Mistral.
3. Use `MISTRAL_API_KEY`, `https://api.mistral.ai/v1`, and the `mistral-large-2512` model identifier for Mistral Large 3.
4. Aggregate provider failures into the final thrown error only if all configured providers fail.

This fallback applies to both receipt parsing and bank statement parsing, including the bank statement reparse flow.

## Alternatives Considered

Use Mistral as the primary provider and Groq as fallback. Rejected because the current production path already depends on Groq behavior and prompt tuning, so keeping Groq first minimizes behavioral change.

Handle fallback only in higher-level orchestrators. Rejected because provider failures can also happen inside the shared OpenAI-compatible parser itself, including JSON parsing and reparse flows, so the fallback is more reliable at the provider abstraction boundary.

Fail immediately and ask the user to retry manually. Rejected because the OCR text is already available, and an automatic retry to a second provider is faster and more resilient.

## Consequences

Positive: Receipt and bank statement parsing become more resilient to provider outages, missing primary credentials, and transient Groq failures.

Positive: Existing parser contracts remain stable because the fallback is internal to the parser implementation.

Trade-off: Parsing behavior can now vary slightly between Groq and Mistral outputs for the same OCR text, so tests must cover both primary and fallback paths.

Risk: If both providers fail, the final error becomes an aggregated provider error and may be longer than previous single-provider messages.

## Related Notes

- `frontend/lib/ocr/openai-parser.ts`
- `frontend/features/receipts/__tests__/openai-parser.test.ts`
- `docs/decisions/050-migrate-to-openai-compatible-parser-via-groq.md`
- `docs/decisions/054-ocr-fallback-mechanism.md`
