# ADR-082: Resilient Extension Authentication via Server-Side Refresh Token Exchange

## Status

Accepted

## Context

In ADR-079, the browser extension captured Supabase session cookies from `fintrek.web.id` and passed the `accessToken` via `Authorization: Bearer <token>` to `POST /api/investments/sync/bibit`.
However, Supabase access tokens expire every 60 minutes (`exp: 3600`). In production testing, users repeatedly received `401 (Unauthorized)` because:
1. When tabs to `fintrek.web.id` are closed or backgrounded, the stored access token in the browser's cookie jar becomes stale.
2. In ADR-079, automatic refresh token exchange was explicitly deferred (`Automatic refresh-token exchange is deferred`).
3. Client-side token re-fetching or re-login creates significant friction and forces users to manually sign out and sign in again whenever more than one hour elapses.

## Decision

1. **Relay Refresh Token from Extension (`packages/browser-extension`)**:
   - `auth.ts`: Already extracts both `accessToken` and `refreshToken` from the Supabase session cookie.
   - `background/index.ts`: Returns `refreshToken` alongside `token` in response to `GET_AUTH_TOKEN`.
   - `bibit-content.ts`: Attaches `x-refresh-token: <refreshToken>` header whenever issuing sync requests to `POST /api/investments/sync/bibit`.

2. **CORS Configuration (`frontend/lib/cors.ts`)**:
   - Add `x-refresh-token` to `Access-Control-Allow-Headers` in `buildCorsHeaders()`.

3. **Server-Side Auto-Refresh Fallback (`frontend/app/api/investments/sync/bibit/route.ts`)**:
   - First authenticate using `supabase.auth.getUser(bearerToken)`.
   - If `user` is null (e.g. access token is expired or invalidated) and `x-refresh-token` header is present:
     - Execute `supabase.auth.refreshSession({ refresh_token: refreshToken })`.
     - If successful, authenticate the user session seamlessly and proceed with portfolio synchronization.
   - If both bearer verification and refresh token exchange fail, return `401 Unauthorized`.

## Alternatives Considered

- **Personal API Keys in Settings**: Highly resilient, but requires user onboarding steps (creating key, copying to popup). Refresh token exchange works transparently with zero manual configuration.
- **Client-Side Refresh in Extension via Supabase SDK**: Requires embedding Supabase Anon Key and URL in extension bundle, increasing configuration overhead and potential drift. Server-side exchange keeps credentials and exchange logic centralized.

## Consequences

**Positive**:
- Users can sync portfolios from Bibit without worrying about 1-hour JWT expiration. As long as the user has logged into FinTrack within the refresh token lifetime (typically 30 days), sync succeeds automatically.
- Completely seamless user experience matching enterprise extensions like Notion Web Clipper.
- Fully backward compatible: requests with valid Bearer tokens or cookie sessions continue working without changes.

**Trade-offs / Risks**:
- `x-refresh-token` traverses cross-origin request over HTTPS. Protected by TLS and CORS allow-list (`https://app.bibit.id`).

## Related Notes

- Extends ADR-079: Extension Auth via Supabase Session Cookie
- Extends ADR-078: CORS for Bibit Extension Sync Endpoint
- `frontend/lib/cors.ts`
- `frontend/app/api/investments/sync/bibit/route.ts`
- `packages/browser-extension/src/background/index.ts`
- `packages/browser-extension/src/content/bibit-content.ts`
