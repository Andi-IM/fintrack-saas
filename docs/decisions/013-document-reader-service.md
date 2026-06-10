# ADR-013: Introduce Modal-based docTR OCR Service (document-reader-service)

## Status
Accepted

## Context
Our application needs to extract text and structure from financial documents (such as invoices, bank statements, and receipts). High-quality OCR (Optical Character Recognition) is required to parse these documents accurately. Standard OCR APIs can be expensive or lack layout awareness (which is essential for parsing tables in bank statements). 

We need a solution that:
1. Provides state-of-the-art layout-aware OCR.
2. Runs efficiently on GPU acceleration without incurring high, permanent hosting costs.
3. Integrates cleanly with our existing TypeScript frontend.

## Decision
We will build a dedicated Python backend service under `backend/document-reader-service` using:
- **python-doctr (docTR)** with a PyTorch backend as the OCR engine, which is a state-of-the-art, layout-aware OCR tool.
- **FastAPI** to expose a simple, standardized HTTP API endpoint for processing documents.
- **Modal** for serverless GPU deployment (specifically targeting Nvidia T4 GPUs), which provides fast processing speeds (under GPU acceleration) and auto-scales down to zero when idle, keeping costs minimal.
- **uv** for Python virtual environment creation and package dependency management to guarantee fast, reproducible builds.

All document reader responses will be transformed into a standardized JSON schema:
```json
{
  "status": "success | error",
  "message": "Human readable message",
  "data": {
    "filename": "string",
    "page_count": "number",
    "pages": [
      {
        "page_index": "number",
        "dimensions": ["height", "width"],
        "full_text": "string",
        "blocks": [
          {
            "geometry": [[x_min, y_min], [x_max, y_max]],
            "text": "string",
            "confidence": "number"
          }
        ]
      }
    ]
  },
  "metadata": {
    "model": "doctr",
    "backend": "torch",
    "timestamp": "ISO-8601 string"
  }
}
```

## Alternatives Considered
- **Tesseract OCR (CPU)**: Rejected due to lower accuracy on skewed/low-resolution documents and complex multi-column layouts.
- **Proprietary Cloud OCRs (Google Cloud Document AI, AWS Textract)**: Kept as alternatives/fallbacks, but self-hosting docTR on Modal gives us full control over parsing pipelines, costs, and data privacy.
- **Always-on GPU VMs (AWS EC2, RunPod)**: Rejected due to high baseline idle costs, as OCR tasks are sporadic rather than continuous in this SaaS application.

## Consequences
- High-performance, GPU-accelerated OCR with auto-scaling to zero cost when not in use.
- The repository becomes a multi-language monorepo: `frontend/` (Next.js/TypeScript) and `backend/document-reader-service/` (FastAPI/Python).
- Local testing requires setting up a python environment with `uv` and having a Modal account configured (`modal token set` or `.env` keys).
