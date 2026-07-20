# ADR-055: Use Modal docTR as the Primary OCR Extractor

## Status
Accepted

## Supersedes
Supersedes ADR-048's "Google AI Vision only" extractor restriction and narrows ADR-015 from "docTR with Vision fallback" to "docTR as the primary OCR dependency".

## Context
The OCR pipeline previously depended on Google Cloud Vision for text extraction while using local or LLM-backed parsers to structure the recognized text. The repository already contains a Modal-hosted `document-reader-service` using docTR, and ADR-013/ADR-015 established that service as an accepted OCR capability.

The current requirement is to replace the Vision API OCR path with Modal. This removes the need for `GOOGLE_CLOUD_API_KEY` during scanning and standardizes extraction through the dedicated GPU-backed OCR service.

## Decision
The Next.js `DocumentProcessor` will register `DoctrOcrExtractor` as its OCR extractor for receipts and bank statements. `DoctrOcrExtractor` will handle supported image and PDF MIME types whenever the pipeline receives those file types.

Runtime OCR extraction requires:
- `OCR_SERVICE_URL`, pointing to the deployed Modal ASGI endpoint.
- `OCR_API_KEY`, matching the secret configured in the Modal service.

The existing Groq/OpenAI-compatible parsers remain responsible for structuring extracted receipt and bank statement text.

## Alternatives Considered
1. Keep Google Cloud Vision as the default and use Modal only for Jago statements: rejected because the requirement is to move OCR away from Vision API.
2. Keep Vision as a fallback after Modal: rejected for now because it preserves the previous OCR dependency and keeps `GOOGLE_CLOUD_API_KEY` operationally required for fallback behavior.
3. Move parsing into the Modal service: rejected because current TypeScript parsers already contain application-specific schema, timezone, and bank/receipt rules.

## Consequences
Positive impacts:
- OCR extraction is standardized on the repository-owned Modal/docTR service.
- The frontend no longer needs Google Cloud Vision credentials for the scan workflow.
- PDF and image OCR use the same extraction service.

Trade-offs and risks:
- Local scanning now requires a reachable Modal deployment or a compatible service endpoint.
- Modal service downtime directly affects OCR extraction unless a future fallback is reintroduced.
- Existing OCR output shape may differ from Vision output, so parser regressions should be monitored with receipt and bank statement fixtures.

## Related Notes
- [ADR-013: Introduce Modal-based docTR OCR Service](./013-document-reader-service.md)
- [ADR-015: Integrating docTR OCR Service with Next.js Frontend](./015-integrate-doctr-ocr-frontend.md)
- [ADR-050: Migrate to OpenAI-Compatible Parser via Groq](./050-migrate-to-openai-compatible-parser-via-groq.md)
- `frontend/lib/ocr/processor.ts`
- `frontend/lib/ocr/doctr.ts`
