# ADR-014: Authenticating docTR OCR Service Endpoints

## Status
Accepted

## Context
The docTR OCR service (`document-reader-service`) will be deployed serverlessly on Modal. Since Modal services are accessible via public URLs, we need to prevent unauthorized access and usage of our GPU-accelerated endpoints to protect our resources and limit costs.

## Decision
We will implement an API Key-based authentication mechanism for the OCR service.

### Technical Implementation:
1. **Authentication Schemes**: We will support two standard methods for passing the API key in incoming HTTP requests:
   - Standard HTTP Bearer token: `Authorization: Bearer <API_KEY>`
   - Custom HTTP header: `X-API-Key: <API_KEY>`
2. **FastAPI Dependencies**: We will use FastAPI's dependency injection (`Depends`) with `HTTPBearer` and `APIKeyHeader` to enforce authentication on the endpoint.
3. **Modal Secret Integration**:
   - The expected API key will be retrieved from the `OCR_API_KEY` environment variable.
   - We will use `modal.Secret.from_dotenv()` in `main.py` so that Modal automatically packages the `.env` variables from the local workspace.
   - For production, `modal.Secret.from_name("ocr-secrets")` can also be used as a fallback or primary configuration source.
4. **Validation Logic**:
   - If `OCR_API_KEY` is not set on the server, the service will refuse all requests with an `HTTP 500 Internal Server Error` to prevent silent misconfiguration.
   - Missing or invalid API keys will result in an `HTTP 401 Unauthorized` response.

## Alternatives Considered
- **Supabase JWT Verification**: Decoding and verifying the user's Supabase access token in Python. While more granular, it introduces a dependency on Supabase's public keys, increases latency, and makes service-to-service testing more difficult. We prefer simple API Key auth since the service is primarily called from our secure Next.js Server Actions (backend-to-backend communication).
- **IP Whitelisting**: Rejected because the frontend is deployed on serverless platforms (like Vercel) with dynamic IP ranges.

## Consequences
- The Next.js frontend will need to pass the configured `OCR_API_KEY` when calling the OCR endpoint.
- Local testing requires setting up a `.env` file with `OCR_API_KEY=your_key` in the `backend/document-reader-service` directory.
