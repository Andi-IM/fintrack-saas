# ADR-016: Routing Bank Jago Statements specifically to docTR OCR Service

## Status
Accepted

## Context
We have integrated the serverless `document-reader-service` (docTR OCR) with our frontend `DocumentProcessor`. Currently, if `OCR_SERVICE_URL` is set, the processor routes *all* incoming PDF and image documents to docTR. 

However, running docTR uses GPU resources on Modal, which costs money and time (cold starts for GPU containers). For most standard bank statements or receipts, fast and cheap APIs like Google Cloud Vision or OCR.space are sufficient. 

Bank Jago statements have specific characteristics:
1. **Multi-account and format**: The statement file follows the naming format `Jago_(nama_rekening)_History_(tanggal).pdf`.
2. **Timeline flexibility**: Unlike BNI, BSI, or SeaBank, Bank Jago statement histories are not restricted to a single month and can span multiple months.
3. **Table layout**: The statement consists of a highly complex multi-column table layout containing:
   - "Tanggal & Waktu" (Date & Time)
   - "Sumber/Tujuan" (Source/Target)
   - "Rincian Transaksi" (Transaction Details)
   - "Catatan" (Notes)
   - "Jumlah" (Amount)
   - "Saldo" (Balance)
4. **Balance tracking**: Initial and final balances are derived dynamically from the positions inside the "Saldo" column.

Because of this complex and column-dependent layout, standard line-by-line OCR engines (like OCR.space or GCV) often merge column text horizontally, breaking the parsing logic. docTR's layout-aware OCR blocks are specifically required to preserve column boundaries for Bank Jago statements. 

To optimize serverless GPU costs, we want to run docTR *only* when the uploaded document is identified as a Bank Jago statement, and fall back to cheaper engines for other documents.

## Decision
We will modify the frontend `DocumentProcessor` to dynamically detect if a document is a Bank Jago statement using the filename pattern (checking if the filename contains `"jago"`, case-insensitive). 

If a Bank Jago statement is detected and `OCR_SERVICE_URL` is configured, the processor will route the document to `DoctrOcrExtractor`. Otherwise, it will fall back to `OcrSpaceExtractor` (for PDFs) or `VisionExtractor` (for images).

## Alternatives Considered
- **Always run docTR for all files**: Rejected because it increases serverless GPU costs for documents that can be parsed successfully with cheaper/faster OCR engines.
- **Let users manually select OCR engine in UI**: Rejected because it degrades the user experience by requiring manual input for what should be an automated system.
- **Lightweight text extraction check**: Rejected because extracting text from digital PDFs in the Server Action before running OCR adds extra latency and requires a Node.js PDF parsing library dependency.

## Consequences
- Optimized GPU resource usage on Modal (reducing hosting costs).
- High-quality layout-aware parsing remains active specifically for Bank Jago statements.
- Other bank statements and receipts fall back to standard OCR channels.
