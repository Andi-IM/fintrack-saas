# ADR-083: Scoped API Key Authentication for Browser Extension and Ingestion

## Status
Accepted

## Context
The FinTrack browser extension allows users to capture investment portfolio data from external platforms (e.g., Bibit) and synchronize it into FinTrack via `POST /api/investments/sync/bibit`.

Previously, ADR-079 and ADR-081 relied on reading Supabase SSR cookies (`sb-*-auth-token`) from the browser using `chrome.cookies`. This approach encountered multiple operational and security friction points:
1. **Short Lifespan (60 Minutes)**: Supabase JWT access tokens expire every hour. When users perform sync operations after their web session token expires, requests fail with `401 Unauthorized`.
2. **Fragile Cookie Parsing**: Supabase SSR chunking and Base64URL encoding formats (`base64-` prefixes) create tight coupling between the extension and Supabase internal library implementations.
3. **Elevated Permissions**: Requesting the broad `cookies` permission in `manifest.json` triggers privacy alerts in the Chrome Web Store and limits use across different browser profiles or containers.
4. **Excessive Privilege**: A full user JWT has permission to modify all user resources, whereas the extension only requires permission to ingest investment portfolio data.

## Decision
We implement a dedicated, scoped **Personal API Key (Sync Token)** mechanism for the browser extension and external ingestion endpoints:

1. **Token Cryptography and Storage**:
   - Keys use the format `ft_sync_<64-character-hex>` (derived from 32 bytes of cryptographically secure random entropy via `crypto.randomBytes(32)`).
   - **Zero Plaintext Storage**: Plaintext keys are shown to the user **only once** at creation time.
   - The database stores only the one-way **SHA-256 hash** (`key_hash`) along with a display prefix (`key_prefix`, e.g., `ft_sync_a1b2...`).
2. **Database Schema (`api_keys`)**:
   - Managed in Supabase PostgreSQL under `public.api_keys` with foreign key to `auth.users(id)` and Row-Level Security (RLS) enabled.
   - Includes fields for `scopes` (default: `['investments:sync']`), `is_active`, `last_used_at`, and timestamps.
   - Verification is supported via an atomic `SECURITY DEFINER` function `public.verify_and_use_api_key(p_key_hash, p_scope)` and server-side verification using the Supabase Service Role client.
3. **Hybrid Authentication on Ingestion Endpoints**:
   - `POST /api/investments/sync/bibit` checks for the `x-api-key` header first.
   - If `x-api-key` is present, it validates the hash and verifies the `investments:sync` scope, executing the portfolio synchronization on behalf of the associated user.
   - If `x-api-key` is absent, it falls back to standard Supabase cookie/Bearer session authentication.
4. **Extension Storage and Isolation**:
   - The key is saved in `chrome.storage.local` within the extension's isolated storage sandbox.
   - The `cookies` permission is no longer strictly required for sync authentication, reducing the extension's permission footprint.

## Alternatives Considered
1. **Relying solely on Supabase Refresh Tokens**:
   - *Rejected*: While refresh tokens can renew an access token (ADR-082), they still require the user to have recently logged into FinTrack in the exact same browser profile and cookie jar, and are susceptible to rotation race conditions.
2. **OAuth2 Authorization Code Flow with PKCE**:
   - *Rejected for now*: Excessive complexity for a single-developer or personal SaaS extension workflow. API Keys offer immediate revocation, fine-grained scoping, and transparent UX with significantly less overhead.

## Consequences
- **Positive**:
  - Browser extension sync is 100% immune to 60-minute session expiration.
  - Least privilege: Compromising a sync key does not grant access to banking, receipts, billing, or credentials.
  - Users can revoke or regenerate keys instantly from FinTrack settings.
  - Clear, predictable error messages in the extension popup and content scripts.
- **Trade-offs / Mitigations**:
  - Users must copy-paste their API Key once into the extension popup. A guided modal in FinTrack UI with a 1-click copy button minimizes friction.

## Related Notes
- [076-bibit-portfolio-sync-via-extension.md](file:///d:/01_Projects/fintrack-saas/docs/decisions/076-bibit-portfolio-sync-via-extension.md)
- [079-extension-auth-via-supabase-session-cookie.md](file:///d:/01_Projects/fintrack-saas/docs/decisions/079-extension-auth-via-supabase-session-cookie.md)
- [082-resilient-extension-sync-via-refresh-token.md](file:///d:/01_Projects/fintrack-saas/docs/decisions/082-resilient-extension-sync-via-refresh-token.md)
- [bibit-content.ts](file:///d:/01_Projects/fintrack-saas/packages/browser-extension/src/content/bibit-content.ts)
- [route.ts](file:///d:/01_Projects/fintrack-saas/frontend/app/api/investments/sync/bibit/route.ts)
