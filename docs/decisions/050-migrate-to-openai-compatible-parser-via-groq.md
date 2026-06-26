# ADR-050: Migrate to OpenAI-Compatible Parser via Groq

## Status

Proposed

## Supersedes

Supersedes ADR-048 (Fully Gemini-Based Receipt Parsing and Google AI Vision Only)

## Context

The system previously used Google Gen AI (`@google/genai` library) for structured LLM parsing in `GeminiReceiptParser` and `GeminiBankStatementParser`.
However, the Gemini API has encountered compatibility issues (e.g. model `gemini-3.1-pro` or model changes returning 404 / NOT_FOUND errors) and the user requests to migrate the backend to use the Groq API via the OpenAI-compatible client library with the `GROQ_API_KEY` environment variable.

Groq offers high-performance, lower latency, and cost-effective LLM processing, fully supporting the OpenAI chat completions format. By migrating the parser to an OpenAI-compatible structure calling Groq, we solve the dependency issues and increase parsing reliability.

## Decision

We will:
1. Install the official `openai` SDK (`pnpm add openai` in `frontend`).
2. Create `frontend/lib/ocr/openai-parser.ts` to replace `frontend/lib/ocr/gemini-parser.ts`.
3. In `openai-parser.ts`, implement `OpenAIReceiptParser` and `OpenAIBankStatementParser` using the `openai` client.
4. The client will be configured with `apiKey: process.env.GROQ_API_KEY` and `baseURL: "https://api.groq.com/openai/v1"`.
5. Use `llama-3.3-70b-versatile` as the default parsing model on Groq, configured with `response_format: { type: "json_object" }` to ensure structured JSON output.
6. Provide clear system/user prompts specifying the target JSON schema (since Groq's JSON mode requires explicit schema instructions in the prompt to behave correctly).
7. Delete `frontend/lib/ocr/gemini-parser.ts`.
8. Update all imports in:
   - `frontend/lib/ocr/receipt-parser.ts`
   - `frontend/lib/ocr/processor.ts`
   - `frontend/lib/ocr/bank-statement-parser.ts`
9. Rename `frontend/features/receipts/__tests__/gemini-parser.test.ts` to `openai-parser.test.ts` and update it to mock the `openai` client.

## Alternatives Considered

1. **Direct HTTP Fetch to Groq API**: Avoids installing `openai` package, but lacks standard TypeScript types, helper functions, and error handling structure provided by the official OpenAI library.
2. **Using `@google/genai` with custom endpoint**: Not natively supported by the Google Gen AI client library without complex wrappers.

## Consequences

### Positive
* **Reliability**: Eliminates Google Gen AI 404 model errors.
* **Speed**: Groq's Llama inference is extremely fast, reducing the overall latency of the scan process.
* **Standardization**: OpenAI API is the industry standard compatibility layer, making it easy to swap models or providers in the future.

### Risks
* **Structured Output Strictness**: Groq JSON mode is less strictly enforced at the API schema level compared to Gemini's native `responseSchema`. We mitigate this by adding clear schema instructions in the prompt and verifying the parser robustly.
