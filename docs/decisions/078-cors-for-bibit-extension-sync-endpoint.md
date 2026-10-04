# ADR-078: CORS Support for the Bibit Extension Sync Endpoint

## Status

Accepted

## Supersedes

None. Extends ADR-076 (Bibit Portfolio Sync via Browser Extension) and ADR-077 (Harden Bibit Extension Data Capture Security) with the cross-origin transport decision required to actually deliver captured data.

## Context

ADR-076 and ADR-077 established the browser extension that captures the Bibit portfolio on `https://app.bibit.id` and syncs it to FinTrack via `POST /api/investments/sync/bibit`. That request is a genuine cross-origin call: the content script runs on the origin `https://app.bibit.id`, while the FinTrack API is served from `https://fintrek.web.id`.

Browsers enforce the CORS protocol for such calls. With a `Content-Type: application/json` body, the browser first sends a preflight `OPTIONS` request. The shipped endpoint had no `OPTIONS` handler and returned no `Access-Control-Allow-*` headers, so every sync attempt failed in the browser with:

```
Access to fetch at 'https://fintrek.web.id/api/investments/sync/bibit'
from origin 'https://app.bibit.id' has been blocked by CORS policy:
Response to preflight request doesn't pass access control check:
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

Next.js answered the preflight with an empty `204`, so the failure surfaced as a missing header rather than a network error. The content script also sends `credentials: 'include'` (ADR-076 model: rely on the authenticated FinTrack session cookie). Because credentialed CORS forbids the wildcard `Access-Control-Allow-Origin: *`, the allowed origin must be echoed explicitly.

## Decision

Add CORS handling to the extension-facing sync endpoint only, with an explicit origin allow-list:

1. **Dedicated helper** (`frontend/lib/cors.ts`):
   - `resolveCorsOrigin(requestOrigin)` returns the request origin only if it is in the allow-list; otherwise `null`.
   - `buildCorsHeaders(requestOrigin)` returns `Access-Control-Allow-Origin: <origin>`, `Access-Control-Allow-Credentials: true`, `Access-Control-Allow-Methods: POST, OPTIONS`, `Access-Control-Allow-Headers: Content-Type, Authorization`, `Access-Control-Max-Age: 86400`, and `Vary: Origin` — or `{}` for disallowed origins.
   - `corsPreflightResponse(request)` returns a `204` with those headers.

2. **Allow-list is configurable** via the `EXTENSION_ALLOWED_ORIGINS` environment variable (comma-separated). It defaults to `https://app.bibit.id` when unset, so no production secret is required for the common case.

3. **Endpoint wiring** (`frontend/app/api/investments/sync/bibit/route.ts`):
   - Export `OPTIONS` returning `corsPreflightResponse(req)`.
   - Attach `buildCorsHeaders(req.headers.get('origin'))` to every `POST` response (200, 400, 401, 500).

4. **Scope**: CORS is applied per-route, not globally, so only the endpoints the extension calls become cross-origin reachable. Authentication is unchanged: the endpoint still requires an authenticated FinTrack session via `supabase.auth.getUser()`.

5. **Credentialed CORS, not wildcard**: `Access-Control-Allow-Origin` is always the exact allowed origin and never `*`, which is mandatory when `Access-Control-Allow-Credentials: true` is set.

## Alternatives Considered

- **Global CORS middleware for all API routes**: Rejected — needlessly exposes every endpoint to cross-origin callers. Per-route opt-in keeps the surface minimal.
- **`Access-Control-Allow-Origin: *`**: Rejected — incompatible with the existing cookie-based `credentials: 'include'` flow and would allow any site to call the endpoint with the user's cookies.
- **Proxy the request through the extension service worker**: Rejected — service-worker `fetch` is still cross-origin and subject to CORS; it does not remove the requirement. It could only help by dropping cookies, which would break session auth.
- **Switch to `Authorization: Bearer` tokens instead of cookies**: Deferred — it is the more robust long-term model for extensions and avoids cross-site cookie constraints (`SameSite`), but requires token acquisition/plumbing in the extension that does not exist yet. Tracked as the fallback if credentialed cookies prove unreliable in practice.

## Consequences

**Positive**:
- The cross-origin sync request from `app.bibit.id` can complete.
- Allow-list restricts cross-origin access to explicitly trusted origins.
- Authentication model is unchanged; no new secret handling.

**Trade-offs / Risks**:
- The allow-list is only as strong as its configuration; a misconfigured `EXTENSION_ALLOWED_ORIGINS` could over-permit. Default is intentionally narrow.
- Cookie delivery across sites depends on the Supabase session cookie's `SameSite` attribute. If the cookie is `SameSite=Lax`, browsers will not attach it to the cross-site request and the endpoint returns `401` even with correct CORS. A `401` after this change indicates the credentialed-cookie path is unviable and the Bearer-token alternative should be implemented.
- `Access-Control-Max-Age: 86400` caches preflight results for 24 hours; allow-list changes may take up to that long to fully propagate for returning clients.

## Related Notes

- Extends ADR-076: Bibit Portfolio Sync via Browser Extension
- Extends ADR-077: Harden Bibit Extension Data Capture Security
- ADR-074: Investment Portfolio Tracking & Browser Extension
- `frontend/lib/cors.ts`
- `frontend/app/api/investments/sync/bibit/route.ts`
- `frontend/.env.example` (`EXTENSION_ALLOWED_ORIGINS`)
- `packages/browser-extension/src/content/bibit-content.ts`
