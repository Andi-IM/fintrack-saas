# ADR-079: Extension Auth via Supabase Session Cookie (chrome.cookies)

## Status

Accepted

## Supersedes

Partially supersedes the transport/auth model of ADR-076 and ADR-078. ADR-078 added CORS for the extension sync endpoint; that remains necessary, but the credentialed-cookie (`credentials: 'include'`) approach it assumed does not work cross-site and is replaced here.

## Context

The Bibit content script runs on `https://app.bibit.id` and syncs captured portfolio data to `POST /api/investments/sync/bibit` on `https://fintrek.web.id`. ADR-078 added CORS so the cross-origin request could execute, but the endpoint then returned `401 Unauthorized`.

Root cause: the endpoint authenticates the user via `supabase.auth.getUser()`, which reads the Supabase session cookie (`sb-<ref>-auth-token`) set on `fintrek.web.id`. That cookie is `SameSite=Lax` by default. Browsers do not attach `Lax` cookies to cross-site requests, so the request from `app.bibit.id` arrived with no session and was rejected. This cannot be fixed on the server or in CORS; it is a cookie-scope limitation of the browser.

Two alternatives were evaluated:

- **B2 — web page broadcasts the access token via `window.postMessage`**: rejected. Any script in the `fintrek.web.id` origin (including an XSS payload) can eavesdrop on a broadcast token. It also requires the user to have a FinTrack tab open to relay the token.
- **B1 — the extension reads the session cookie itself via `chrome.cookies`**: chosen. The token never traverses the page's `window`; it is read by the extension's own trusted context from the cookie store the browser already manages.

## Decision

1. **Extension reads the Supabase session cookie directly** (`packages/browser-extension/src/shared/auth.ts`):
   - `getFinTrackSession()` calls `chrome.cookies.getAll({ domain: 'fintrek.web.id' })`, selects cookies whose name matches `sb-*-auth-token*`, reassembles Supabase SSR chunked cookies (`<base>`, `<base>.0`, `<base>.1`, ...) in index order, URL-decodes, and parses the JSON session payload.
   - Returns `{ accessToken, refreshToken, expiresAt }`; `isSessionExpired()` guards against expired tokens (60s skew).

2. **Content script obtains the token through the background worker**:
   - `bibit-content.ts` sends `{ type: 'GET_AUTH_TOKEN' }` to the background, which returns the current access token.
   - The sync request uses `Authorization: Bearer <token>` and no longer sets `credentials: 'include'`.

3. **Manifest adds the `cookies` permission** (`public/manifest.json`). Existing host permissions (`fintrek.web.id`, `app.bibit.id`) are unchanged.

4. **Backend accepts a Bearer token** (`app/api/investments/sync/bibit/route.ts`):
   - If an `Authorization: Bearer` header is present, authenticate with `supabase.auth.getUser(token)`; otherwise fall back to the cookie-based `getUser()`.
   - CORS from ADR-078 remains; `Authorization` was already in `Access-Control-Allow-Headers`, so the preflight is unchanged.

5. **No web-app changes**: the FinTrack frontend is untouched. It already maintains the session cookie.

## Alternatives Considered

- **`window.postMessage` token bridge (B2)**: Rejected — token observable by any same-origin page script (XSS), plus requires an open FinTrack tab.
- **Server-side Bearer token issuance flow**: Rejected for now — would require a dedicated token endpoint and extension-side secure storage, more surface than reading the browser-managed cookie.
- **Manual token paste**: Rejected — poor UX and error-prone.
- **Set the Supabase cookie to `SameSite=None`**: Rejected — weakens cookie security site-wide, affects all endpoints, and is not necessary once the extension reads the cookie directly.

## Consequences

**Positive**:
- Cross-origin sync authenticates reliably without depending on cross-site cookie delivery.
- Token is read from the browser cookie store by the extension's trusted context; it is never broadcast through the page `window`.
- Backend change is additive and backward compatible (cookie auth still works for same-site callers).

**Trade-offs / Risks**:
- The extension now requests the `cookies` permission, which surfaces an additional warning at install/update time and needs justification for Chrome Web Store review.
- The extension holds a live access token in memory during a sync; it is not persisted beyond the request.
- Token freshness depends on the browser's copy of the Supabase cookie. If the FinTrack session has not refreshed in the browser and the access token is expired, the extension returns "Session expired" and the user must reload FinTrack to refresh it. Automatic refresh-token exchange is deferred.
- Reassembly logic depends on Supabase SSR cookie naming (`sb-<ref>-auth-token` and chunking); a Supabase naming change would require updating `auth.ts`.

## Related Notes

- Replaces the credentialed-cookie model assumed in ADR-078: CORS Support for the Bibit Extension Sync Endpoint
- Extends ADR-077: Harden Bibit Extension Data Capture Security
- ADR-076: Bibit Portfolio Sync via Browser Extension
- `packages/browser-extension/src/shared/auth.ts`
- `packages/browser-extension/src/content/bibit-content.ts`
- `packages/browser-extension/src/background/index.ts`
- `packages/browser-extension/public/manifest.json`
- `frontend/app/api/investments/sync/bibit/route.ts`
