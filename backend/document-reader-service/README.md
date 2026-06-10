# Document Reader Service (docTR OCR API)

This service provides state-of-the-art layout-aware Optical Character Recognition (OCR) for financial documents (bank statements, receipts, invoices) using the **docTR (Document Text Recognition)** library with PyTorch, deployed serverlessly on **Modal** using GPU acceleration.

---

## 🚀 Features
- **High-Quality OCR**: Layout-aware detection and recognition using deep learning (docTR + PyTorch).
- **Serverless Scaling**: Auto-scales down to zero when idle, avoiding permanent GPU hosting costs.
- **Fast Execution**: Scaled on Nvidia T4 GPU instances on Modal.
- **Standardized Output**: Returns clean, normalized JSON containing pages, dimensions, blocks, geometries, and OCR confidence levels.

---

## 🛠️ Tech Stack
- **Language**: Python 3.12+
- **OCR Engine**: [python-doctr](https://github.com/mindee/doctr) (with PyTorch backend)
- **API Framework**: FastAPI (running as an ASGI application)
- **Runtime & Deployment**: Modal (Serverless GPU)
- **Dependency Management**: `uv`

---

## 📁 Directory Structure
```
backend/document-reader-service/
├── .gitignore            # Git ignore rules for Python/uv
├── GEMINI.md             # Core engineering standards
├── README.md             # This documentation
├── main.py               # API & Modal deployment configuration
├── pyproject.toml        # Project metadata & dependency declarations
└── uv.lock               # Pinned packages lockfile
```

---

## 💻 Local Setup & Development

### 1. Prerequisites
- Install [uv](https://github.com/astral-sh/uv) (fast Python package manager).
- Create a [Modal Account](https://modal.com/) and authorize it locally:
  ```bash
  uv run modal setup
  ```

### 2. Install Dependencies
Initialize and sync the virtual environment using `uv`:
```bash
uv sync
```
This creates a local `.venv` and installs the required packages (including PyTorch, docTR, and Modal).

### 3. Local Development / Remote Run
To test and execute the service remotely through Modal from your local terminal:
```bash
uv run modal run main.py
```

---

## ☁️ Deployment

Deploy the FastAPI app as a persistent serverless endpoint on Modal:
```bash
uv run modal deploy main.py
```
After deployment, Modal will provide a public web URL (e.g., `https://<your-username>-ocr-api.modal.run`).

---

## 🔌 API Reference

### **POST /**
Uploads a document (PDF or Image) to be processed.

#### **Request**
- **Content-Type**: `multipart/form-data`
- **Headers**:
  - `X-API-Key`: `your_secure_random_key_here` **OR**
  - `Authorization`: `Bearer your_secure_random_key_here`
- **Body**:
  - `file`: The binary document file (PDF, PNG, JPG, or JPEG).

#### **Responses**

##### **200 OK**
```json
{
  "status": "success",
  "message": "OCR processed successfully",
  "data": {
    "filename": "bank_statement.pdf",
    "page_count": 1,
    "pages": [
      {
        "page_index": 0,
        "dimensions": [842, 595],
        "full_text": "FINTRACK BANK MUTATION...",
        "blocks": [
          {
            "geometry": [[0.1, 0.1], [0.9, 0.2]],
            "text": "FINTRACK BANK MUTATION",
            "confidence": 0.992
          }
        ]
      }
    ]
  },
  "metadata": {
    "model": "doctr",
    "backend": "torch",
    "timestamp": "2026-06-10T04:29:15.000Z"
  }
}
```

##### **401 Unauthorized**
Returned if the `X-API-Key` or Bearer token is missing, invalid, or mismatched.
```json
{
  "detail": "Could not validate credentials. Missing or invalid API key."
}
```

##### **500 Internal Server Error**
Returned if the server is misconfigured (e.g. `OCR_API_KEY` is not set on the environment).
```json
{
  "detail": "OCR_API_KEY environment variable is not configured on the server."
}
```

---

## 🧪 Testing the Endpoint
To run/test locally or deploy to Modal, you **must** create a `.env` file in this folder:
```env
OCR_API_KEY=your_secure_random_key_here
```

### Testing with curl (Bearer Token)
```bash
curl -X POST \
  -H "Authorization: Bearer your_secure_random_key_here" \
  -F "file=@/path/to/document.pdf" \
  https://<your-username>-ocr-api.modal.run/
```

### Testing with curl (Custom Header)
```bash
curl -X POST \
  -H "X-API-Key: your_secure_random_key_here" \
  -F "file=@/path/to/document.pdf" \
  https://<your-username>-ocr-api.modal.run/
```

