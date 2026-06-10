import os
import modal

# 1. Definisi Image
image = (
    modal.Image.debian_slim(python_version="3.12")
    .apt_install("libglib2.0-0", "libgl1", "libsm6", "libxext6")
    .pip_install(
        "python-doctr[torch]",
        "torch",
        "torchvision",
        "pypdfium2",
        "fastapi[standard]",
        "python-multipart"
    )
    .run_commands(
        "USE_TORCH=1 python -c 'from doctr.models import ocr_predictor; ocr_predictor(pretrained=True)'"
    )
)

app = modal.App("doctr-web-api")

@app.function(
    image=image,
    gpu="T4",
    timeout=600,
    scaledown_window=60,
    memory=4096, # Tambah memori ke 4GB
    secrets=[modal.Secret.from_dotenv()]
)
@modal.asgi_app(label="ocr-api")
def api():
    from fastapi import FastAPI, File, UploadFile, HTTPException, Depends, Security
    from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials, APIKeyHeader
    from fastapi.middleware.cors import CORSMiddleware
    from datetime import datetime
    import os
    
    web_app = FastAPI(title="docTR OCR API")
    
    # Tambahkan CORS agar bisa dipanggil dari frontend mana saja
    web_app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Otentikasi API Key (Bearer Token & Custom Header)
    security_bearer = HTTPBearer(auto_error=False)
    security_header = APIKeyHeader(name="X-API-Key", auto_error=False)

    async def verify_api_key(
        bearer: HTTPAuthorizationCredentials = Security(security_bearer),
        header: str = Security(security_header)
    ):
        expected_key = os.environ.get("OCR_API_KEY")
        if not expected_key:
            raise HTTPException(
                status_code=500,
                detail="OCR_API_KEY environment variable is not configured on the server."
            )
        
        token = None
        if bearer:
            token = bearer.credentials
        elif header:
            token = header
            
        if not token or token != expected_key:
            raise HTTPException(
                status_code=401,
                detail="Could not validate credentials. Missing or invalid API key."
            )
        return token

    def transform_result(result, filename: str):
        """Transform docTR result to standardized format."""
        exported = result.export()
        pages = []
        
        for page_idx, page in enumerate(exported["pages"]):
            full_text_parts = []
            blocks = []
            
            for block in page["blocks"]:
                block_text_parts = []
                # Confidence average for the block
                block_confidences = []
                
                for line in block["lines"]:
                    for word in line["words"]:
                        block_text_parts.append(word["value"])
                        block_confidences.append(word["confidence"])
                
                block_text = " ".join(block_text_parts)
                full_text_parts.append(block_text)
                
                blocks.append({
                    "geometry": block["geometry"],
                    "text": block_text,
                    "confidence": sum(block_confidences) / len(block_confidences) if block_confidences else 0
                })
            
            pages.append({
                "page_index": page_idx,
                "dimensions": page["dimensions"],
                "full_text": "\n".join(full_text_parts),
                "blocks": blocks
            })
            
        return {
            "status": "success",
            "message": "OCR processed successfully",
            "data": {
                "filename": filename,
                "page_count": len(pages),
                "pages": pages
            },
            "metadata": {
                "model": "doctr",
                "backend": "torch",
                "timestamp": datetime.utcnow().isoformat()
            }
        }

    @web_app.post("/")
    async def ocr_endpoint(
        file: UploadFile = File(...),
        _api_key: str = Depends(verify_api_key)
    ):
        try:
            os.environ['USE_TORCH'] = '1'
            from doctr.io import DocumentFile
            from doctr.models import ocr_predictor
            import torch

            # Pastikan file ada
            content = await file.read()
            if not content:
                raise HTTPException(status_code=400, detail="File is empty")
            
            # Deteksi tipe file
            try:
                if file.filename.lower().endswith(".pdf"):
                    doc = DocumentFile.from_pdf(content)
                else:
                    doc = DocumentFile.from_images([content])
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Invalid file format: {str(e)}")

            # Inisialisasi model di GPU
            predictor = ocr_predictor(pretrained=True).cuda()

            # Proses OCR
            result = predictor(doc)

            # Transformasi ke format standar
            return transform_result(result, file.filename)
            
        except HTTPException as he:
            raise he
        except Exception as e:
            return {
                "status": "error",
                "message": f"An unexpected error occurred: {str(e)}",
                "metadata": {
                    "timestamp": datetime.utcnow().isoformat()
                }
            }

    return web_app

@app.local_entrypoint()
def test_local():
    # Gunakan modal run deploy_modal.py untuk mengetes secara lokal (remote execution)
    pdf_path = "sample_docs.pdf"
    with open(pdf_path, "rb") as f:
        pdf_bytes = f.read()
    
    # Catatan: test_local memanggil fungsi internal, bukan lewat HTTP
    # Tapi karena kita pakai asgi_app, kita sebaiknya mengetes lewat HTTP
    print(f"Deployment selesai. Gunakan test_endpoint.py untuk mencoba.")
