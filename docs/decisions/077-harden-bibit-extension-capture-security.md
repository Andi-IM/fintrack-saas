# ADR-077: Harden Bibit Extension Data Capture Security

## Status

Accepted

## Supersedes

Partially supersedes ADR-076 (Bibit Portfolio Sync via Browser Extension) — specifically the message-passing, storage, and permission decisions.

## Context

ADR-076 introduced passive network interception of the Bibit portfolio within the browser extension. A security review of the shipped implementation (`packages/browser-extension`) found four issues:

1. **Wildcard `postMessage` target origin**: the main-world interceptor relayed sensitive portfolio data with `window.postMessage(payload, '*')`, and the isolated-world receiver did not verify `event.origin`.
2. **Persistent, unencrypted storage**: captured portfolio payloads were written to `chrome.storage.local`, which survives browser restarts and was explicitly rejected by ADR-074 ("tokens must be in `chrome.storage.session` with encryption"). This also stored account value data at rest unnecessarily.
3. **Over-broad host permissions**: `manifest.json` requested `https://api.bibit.id/*` and `https://*.supabase.co/*`, neither of which is called by the extension. An overlapping `optional_host_permissions` entry duplicated `host_permissions`.
4. **Untrusted payload accepted as-is**: the backend sync endpoint (`POST /api/investments/sync/bibit`) validated only that `data.result` was an array, then persisted client-supplied numbers directly.

The extension reads data from a session the user is already authenticated to (`app.bibit.id`); it does not store Bibit credentials. This ADR tightens the surrounding handling without changing that core model.

## Decision

1. **Origin-pinned message passing**:
   - The main-world interceptor must call `window.postMessage(payload, 'https://app.bibit.id')`, never `'*'`.
   - The isolated-world receiver must reject any message where `event.source !== window` or `event.origin !== 'https://app.bibit.id'`.

2. **Session-only storage for captured portfolio data**:
   - Captured Bibit payloads are stored in `chrome.storage.session` (cleared on browser close), not `chrome.storage.local`.
   - The background worker calls `chrome.storage.session.setAccessLevel({ accessLevel: 'TRUSTED_AND_UNTRUSTED_CONTEXTS' })` so content scripts may read/write session storage. This is guarded for browsers that do not support it.

3. **Least-privilege permissions**:
   - `host_permissions` limited to origins actually used: `https://fintrek.web.id/*` and `https://app.bibit.id/*`.
   - Remove unused `api.bibit.id` and `*.supabase.co` entries and the overlapping `optional_host_permissions`.

4. **Client payload is untrusted input**:
   - Both the content script (`isValidBibitPayload`) and the backend endpoint (`isValidPayload`) validate field types, enforce finite numbers within `MAX_AMOUNT` (1e15), bound `result` length (`MAX_RESULT_ITEMS` = 200), and bound string lengths before any persistence.
   - The backend still requires an authenticated FinTrack user session.

## Alternatives Considered

- **Keep `chrome.storage.local`**: Rejected — persists sensitive portfolio values at rest and contradicts ADR-074. Session storage is sufficient because capture happens during an active browsing session.
- **Service-worker-only interception** (no content script): Rejected — would require the extension to call `api.bibit.id` with the user's Bibit token, which reintroduces credential/token handling and CORS/fingerprint risk (see ADR-076 discussion).
- **Encrypt `chrome.storage.local`**: Rejected for now — adds key-management surface for marginal benefit over session-scoped, ephemeral storage.
- **Broad host permissions for future providers**: Rejected — add origins only when a provider is actually integrated.

## Consequences

**Positive**:
- Portfolio data is no longer persisted at rest beyond the browsing session.
- Message channel is origin-pinned; no other origin can inject or eavesdrop on the relayed payload.
- Extension requests only the access it needs, improving Chrome Web Store review and reducing attack surface.
- Malformed or malicious client payloads cannot corrupt stored balances.

**Trade-offs / Risks**:
- `chrome.storage.session` is cleared when the browser closes; the "last synced payload" is not available across restarts. Acceptable for a live-capture flow.
- `setAccessLevel` for session storage is unsupported on older Chromium versions; the guard degrades gracefully but content scripts will not see cached payloads there.
- Client-supplied numbers remain untrusted even after validation; consumers must treat synced values as user-reported, not authoritative.

## Related Notes

- Supersedes parts of ADR-076: Bibit Portfolio Sync via Browser Extension
- ADR-074: Investment Portfolio Tracking & Browser Extension
- ADR-075: Independent Investment Feature and Direct Extension Launcher
- `packages/browser-extension/src/content/bibit-interceptor.ts`
- `packages/browser-extension/src/content/bibit-content.ts`
- `packages/browser-extension/src/background/index.ts`
- `packages/browser-extension/public/manifest.json`
- `frontend/app/api/investments/sync/bibit/route.ts`
