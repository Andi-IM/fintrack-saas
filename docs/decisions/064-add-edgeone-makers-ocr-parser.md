# ADR-064: Add EdgeOne Makers as OpenAI-Compatible OCR Parser Provider

## Status

Accepted

## Context

FinTrack parses physical receipts and raw bank statement OCR text using an OpenAI-compatible interface configured in `frontend/lib/ocr/openai-parser.ts`. Previously, Groq was the primary provider and Mistral Large was the fallback provider.

However, upstream provider changes—such as Groq deprecating `llama-3.3-70b-versatile` or returning 404 model not found, and Mistral requiring strict separate tier keys—can lead to total parsing failures.

Tencent EdgeOne Makers (`https://pages.edgeone.ai/document/models`) provides an OpenAI-compatible AI Gateway (`https://ai-gateway.edgeone.link/v1`) with high-throughput built-in models, specifically `@makers/deepseek-v4-flash`, as well as support for configurable models via environment variables.

## Decision

We add **EdgeOne Makers** into `frontend/lib/ocr/openai-parser.ts` as an OpenAI-compatible LLM provider with `@makers/deepseek-v4-flash` as its default model.

1. **Provider Configuration**:
   - `EdgeOne Makers` is activated when `MAKERS_API_KEY` is present.
   - Default Base URL: `process.env.MAKERS_BASE_URL || 'https://ai-gateway.edgeone.link/v1'`
   - Default Model: `process.env.MAKERS_MODEL || '@makers/deepseek-v4-flash'`
2. **Provider Priority & Fallback Order**:
   - Order: `EdgeOne Makers` (if `MAKERS_API_KEY` configured), then `Groq` (if `GROQ_API_KEY` configured), then `Mistral` (if `MISTRAL_API_KEY` configured).
   - If `MAKERS_API_KEY` is set, it becomes the primary parser, ensuring high availability and bypassing Groq model deprecation issues.
   - If one provider fails, the pipeline seamlessly cascades to the next configured provider.
3. **Environment Updates**:
   - Update `frontend/.env.example` and `frontend/.env.local` to document `MAKERS_API_KEY`, `MAKERS_BASE_URL`, and `MAKERS_MODEL`.

## Alternatives Considered

- **Hardcode replacement of Groq with EdgeOne Makers**: Rejected because keeping a multi-provider fallback list makes the parsing pipeline resilient to outages from any single provider.
- **Require manual switching in settings**: Rejected because the existing `withLlmProviderFallback` automatically handles failovers without user friction.

## Consequences

- Positive: Solves the `404 model not found` error on Groq by using EdgeOne Makers' `@makers/deepseek-v4-flash`.
- Positive: Zero UI disruption; parser maintains the exact same input/output JSON schemas.
- Positive: Developers can configure any EdgeOne Makers model via `MAKERS_MODEL` without code changes.

## Related Notes

- [ADR-050](050-migrate-to-openai-compatible-parser-via-groq.md)
- [ADR-059](059-add-mistral-fallback-for-openai-compatible-parser.md)
- `frontend/lib/ocr/openai-parser.ts`
- `frontend/features/receipts/__tests__/openai-parser.test.ts`
