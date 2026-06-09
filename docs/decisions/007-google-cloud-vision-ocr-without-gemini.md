# ADR-007: Use Google Cloud Vision OCR with Local Parsing

## Status
Accepted

## Context
Initially, the OCR capability of the Finance Tracker applet was designed to run on Google Gemini or other LLMs to parse text and structure receipts/bank statements. However:
1. Setting up and requiring `GEMINI_API_KEY` introduced configuration hurdles for users.
2. The user requested utilizing the Google Cloud Vision API instead of Gemini for OCR text extraction.
3. To avoid external LLM complexity and extra API key configuration requirements, the system must perform text structuring locally on the parsed OCR output without any Gemini/LLM dependency.

## Decision
1. **Google Cloud Vision REST API**: Query the Google Cloud Vision `images:annotate` endpoint directly using the user's `GOOGLE_CLOUD_API_KEY` for optical character recognition (OCR) of uploaded receipt images or bank statement documents.
2. **Purely Local Parsing**:
   - For **Receipts**: Use local Regex and token-based string parsing to extract the merchant (usually the first line), the total amount (scanning for keywords like `total`, `jumlah`, `grand total`, `bayar`), and categorizing using keyword mappings (e.g., matching food, transportation, utilities).
   - For **Bank Statements**: Scan each line for dates (e.g., `DD/MM`), transaction amounts, types (income vs. expense), and assign categories based on matching description substrings.
3. **No Gemini Dependencies**: Eliminate all calls to Gemini, Vercel AI SDK, or intermediate AI gateways for the OCR workflow.

## Alternatives Considered
- **Gemini Pro Vision**: Rejected due to requiring a separate Gemini API key and slow extraction times for standard receipt scans.
- **Vercel AI SDK with Cloudflare AI Gateway**: Rejected because it introduces additional package dependencies and setup complexity when a simpler direct API solution is preferred.

## Consequences
- **Pros**:
  - Extremely fast response times (direct REST call + instant CPU string parsing).
  - No LLM token costs or dependency on Gemini API.
  - Simple setup: only requires `GOOGLE_CLOUD_API_KEY`.
- **Cons**:
  - Regex-based matching is deterministic and might miss edge-case receipt/statement layouts that an LLM would handle dynamically.
