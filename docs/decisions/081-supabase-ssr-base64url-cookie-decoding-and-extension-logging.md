# ADR-081: Supabase SSR Base64URL Cookie Decoding and Extension Diagnostic Logging

## Status

Accepted

## Context

Users testing the Bibit portfolio sync feature encountered the error toast:
`Gagal sinkron: Belum login di FinTrack. Buka fintrek.web.id dan login dulu. Pastikan sudah login di FinTrack.`
However, checking the browser DevTools Console and Network tab revealed no error logs and no network requests (`muncul ini, tapi lognya tidak ada`).

Investigation revealed two root causes:

1. **Supabase SSR Cookie Encoding**:
   `@supabase/ssr` defaults to encoding stored session cookies using `base64url`, prepending a `base64-` prefix (`base64-<base64url-json>`). In ADR-079, `packages/browser-extension/src/shared/auth.ts` only applied `decodeURIComponent` and immediately invoked `JSON.parse`. When presented with a `base64-` string, `JSON.parse` threw a `SyntaxError` and returned `null`, rendering any legitimate FinTrack session unrecognizable.
2. **Missing Diagnostic Logging & Pre-flight Failure**:
   Neither `bibit-content.ts`, `bibit-interceptor.ts`, nor `background/index.ts` had structured `console.log` or `console.error` statements. Because `GET_AUTH_TOKEN` failed before issuing the sync API `fetch`, no network request was triggered to `fintrek.web.id`, and errors were swallowed silently into the UI status text without appearing in the developer console. Additionally, background service worker logs in Chrome extensions are isolated to `chrome://extensions` and do not appear in the webpage console by default.

## Decision

1. **Base64URL Cookie Decoding (`packages/browser-extension/src/shared/auth.ts`)**:
   - Detect the `base64-` prefix in `decodeCookieValue()`.
   - Implement `decodeBase64URL()` to translate base64url characters (`-`, `_`, missing padding `=`) and decode UTF-8 bytes into JSON text.
   - Support both object (`{ access_token, ... }`) and array formats in `parseSession()`.
   - Explicitly target `fintrek.web.id` as `FINTRACK_DOMAIN` so stale localhost development cookies cannot hijack production sync requests.

2. **Diagnostic Logging & Clear Error Propagation**:
   - In `bibit-interceptor.ts`: log when `/portfolios` responses are captured from fetch/XHR.
   - In `bibit-content.ts`: log portfolio payload capture, sync button clicks, token exchange results, outgoing POST payload, HTTP response status, and detailed errors to `console.log` and `console.error`.
   - In `background/index.ts`: log `GET_AUTH_TOKEN` processing, discovered cookie counts by domain, expiration status, and api URL targets.

3. **Manifest Permissions (`public/manifest.json`)**:
   - Add `http://localhost/*` and `http://127.0.0.1/*` to `host_permissions` so developers testing locally can authenticate against a local server instance.

## Alternatives Considered

- **Instruct users to disable SSR base64url cookie encoding in FinTrack**: Rejected — `cookieEncoding: "base64url"` is the modern Supabase SSR default and changing server-wide cookie settings might invalidate existing production sessions.
- **Relay logs via Chrome extension alarms or native messaging**: Rejected — standard `console.log` and `console.error` in the content script and background worker are directly inspectable via DevTools.

## Consequences

**Positive**:
- FinTrack sessions set by `@supabase/ssr` on `fintrek.web.id` are decoded correctly.
- Developers and users can inspect Bibit tab DevTools Console to trace the entire sync lifecycle from interception to backend completion.
- Local testing against `localhost:3000` is supported seamlessly.

**Trade-offs / Risks**:
- Chrome extension users must inspect the background service worker page (`chrome://extensions` -> Inspect views: service worker) to see background-specific logs.

## Related Notes

- Extends ADR-079: Extension Auth via Supabase Session Cookie
- `packages/browser-extension/src/shared/auth.ts`
- `packages/browser-extension/src/content/bibit-content.ts`
- `packages/browser-extension/src/content/bibit-interceptor.ts`
- `packages/browser-extension/src/background/index.ts`
- `packages/browser-extension/public/manifest.json`
