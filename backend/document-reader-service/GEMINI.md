# Project Standards: doctr-ocr

This document outlines the engineering standards and conventions for the `doctr-ocr` project.

## 1. Technical Stack
- **Language:** Python 3.12+
- **OCR Engine:** [python-doctr](https://github.com/mindee/doctr) (PyTorch backend)
- **API Framework:** FastAPI
- **Deployment:** Modal (Serverless GPU)
- **Dependency Management:** `uv`

## 2. Directory Structure
- `main.py`: Local PoC and entry point for CLI testing.
- `deploy_modal.py`: Modal deployment configuration and API implementation.
- `sample_docs.pdf`: Sample document for testing.
- `ocr_result.json`: Reference output for the latest processing.

## 3. Standardized JSON Output Format
All API responses must follow this structure:

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

## 4. Coding Conventions
- **Error Handling:** Use standard FastAPI `HTTPException` with clear status codes.
- **Logging:** Prefer Python's `logging` module over `print` for production code.
- **Environment Variables:** Use `os.environ` for configuration (e.g., `USE_TORCH=1`).
- **Type Hinting:** Use Python type hints for all function signatures.

## 5. Development Workflow
1. **Local Test:** Use `python main.py` to verify OCR logic.
2. **Modal Test:** Use `modal run deploy_modal.py` for remote testing.
3. **API Test:** Use `test_endpoint.py` to verify the deployed API.
