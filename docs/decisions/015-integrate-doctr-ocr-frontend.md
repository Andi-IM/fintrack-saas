# ADR-015: Integrating docTR OCR Service with Next.js Frontend

## Status
Accepted

## Context
We have introduced a Modal-based serverless `document-reader-service` that uses docTR (PyTorch) with GPU acceleration for highly accurate layout-aware OCR. We now need to integrate this backend service into our Next.js frontend's document processing pipeline.

The frontend currently uses:
- `VisionExtractor` (Google Cloud Vision API) for images.
- `OcrSpaceExtractor` (OCR.space API) for PDFs.

We need a clean, configurable integration that uses the new docTR OCR service when available, but falls back to the existing extractors if the service is not configured.

## Decision
We will implement a new `DoctrOcrExtractor` in the frontend and configure the `DocumentProcessor` to prioritize it when configured.

### Technical Implementation:
1. **New Extractor (`DoctrOcrExtractor`)**:
   - Location: `frontend/lib/ocr/doctr.ts`
   - Implements `IExtractor` interface.
   - Supports both `application/pdf` and image types (`image/jpeg`, `image/png`, `image/webp`).
   - Converts the input `base64Data` back to a `Blob` and posts it to the docTR API endpoint using `FormData`.
   - Passes the `OCR_API_KEY` in the `X-API-Key` header for authentication.
   - Concatenates the recognized text from all pages (separated by `\n---PAGE_BREAK---\n` to maintain compatibility with existing statement and receipt parsers).
2. **Environment Variables**:
   - `OCR_SERVICE_URL`: The URL of the deployed Modal service (e.g. `https://andi-im--ocr-api.modal.run`).
   - `OCR_API_KEY`: The API key matching the one in the backend `.env`.
3. **Fallback Strategy in `DocumentProcessor`**:
   - We will register `DoctrOcrExtractor` at the beginning of the extractors list.
   - When selecting an extractor for a given file type, if the matched extractor is `DoctrOcrExtractor`, it will only be chosen if the `OCR_SERVICE_URL` is set in the environment variables. Otherwise, the processor will bypass it and fall back to `VisionExtractor` or `OcrSpaceExtractor`.

## Alternatives Considered
- **Direct client-side fetch to Modal**: Rejected because it would expose our `OCR_API_KEY` on the client browser. Running the OCR API call in Next.js Server Actions (server-side) keeps the API key secure.
- **Hard replace existing extractors**: Rejected because keeping the existing APIs as fallbacks provides high availability and allows local testing without running/deploying to Modal.

## Consequences
- Highly accurate OCR processing for both PDFs and images using docTR.
- Seamless developer experience: local development works out-of-the-box using GCV/OCR.space if Modal keys are not set.
- Secure backend-to-backend communication using the `OCR_API_KEY` header.
