# ADR-080: Remove Dead Portfolio Popup and Background Code from the Extension

## Status

Accepted

## Supersedes

None. Follows through on the direction set in ADR-075 (Independent Investment Feature and Direct Extension Launcher).

## Context

ADR-075 made the investment feature independent inside the FinTrack web app and reduced the extension popup to a launcher that opens it. The popup UI (`src/popup/App.tsx`) was simplified accordingly, but the supporting code was never removed:

- `shared/api.ts` (`apiClient`) called endpoints under `/api/extension/*` (`/portfolio-summary`, `/auth/refresh`) that **do not exist** in the backend. Nothing calls them anymore.
- `background/index.ts` still drove an auto-refresh alarm, toolbar badge, price-alert notifications, portfolio cache, and message handlers (`GET_PORTFOLIO`, `REFRESH_PORTFOLIO`, `SIGN_OUT`) that no UI sends.
- Twelve popup components (`PortfolioSummary`, `AccountsList`, `TopHoldingsList`, `PortfolioHeader`, `EmptyState`, `ErrorState`, `LoadingState`, `RefreshButton`, `SignOutButton`, `SettingsButton`, `ToolbarButtons`, `OpenAppButton`) were only imported by each other, never by the popup entry.
- `shared/types.ts` and `shared/constants.ts` existed solely to type the dead `apiClient` and settings.
- `content/index.ts` compiled to an empty chunk, and `content/content.css` was imported by nothing.
- The `alarms` and `identity` permissions existed only for the dead alarm/badge/auth code.

This dead code was not inert: the background worker attempted requests to non-existent endpoints, producing runtime errors and keeping unused permissions that widen the extension's install/review surface. The only live responsibilities remaining after ADR-079 are (a) reading the FinTrack session cookie to mint a Bearer token for the Bibit sync (`GET_AUTH_TOKEN`), (b) granting session-storage access to content scripts, and (c) opening the web app on icon click.

## Decision

Remove the unused portfolio/popup machinery and keep only the live paths:

1. **Delete** `shared/api.ts`, `shared/types.ts`, `shared/constants.ts`, `content/index.ts`, `content/content.css`, and the twelve unused popup components.
2. **Rewrite** `background/index.ts` to only:
   - `ensureSessionStorageAccess()` on install/startup,
   - answer the `GET_AUTH_TOKEN` message using `shared/auth.ts`,
   - open `https://fintrek.web.id/investments` on `chrome.action.onClicked`.
3. **Drop permissions** `alarms` and `identity` from `manifest.json`; keep `storage` and `cookies`.
4. **Remove the `content` entry** from `vite.config.ts` (eliminates the empty-chunk warning).
5. The popup (`App.tsx`) remains a launcher and is unchanged.

## Alternatives Considered

- **Implement `/api/extension/portfolio-summary` and restore the popup UI**: Rejected — contradicts ADR-075, which deliberately made investments a first-class web-app feature; it would add a second, divergent data path and re-expand permissions.
- **Leave the dead code in place**: Rejected — it actively errors at runtime and inflates the permission/attack surface for no benefit.
- **Keep the `alarms`/`identity` permissions "for future use"**: Rejected — add permissions only when a feature needs them (consistency with ADR-077).

## Consequences

**Positive**:
- The background worker no longer calls non-existent endpoints; runtime error noise is removed.
- Smaller bundle: `background.js` drops from ~7.1 kB to ~2.1 kB and the empty `content` chunk disappears.
- Fewer install-time permission warnings (`alarms`, `identity` gone), improving reviewer and user trust.
- The extension's remaining surface is small and auditable.

**Trade-offs / Risks**:
- The toolbar badge and price-alert notifications no longer exist. If desired later, they must be reintroduced against a real backend endpoint and a fresh permission decision.
- Removed components/types are gone from history only via this commit; restoring them means reverting rather than reusing.

## Related Notes

- Follows ADR-075: Independent Investment Feature and Direct Extension Launcher
- Relates to ADR-076, ADR-077, ADR-078, ADR-079 (Bibit capture, hardening, CORS, and auth)
- `packages/browser-extension/src/background/index.ts`
- `packages/browser-extension/src/popup/App.tsx`
- `packages/browser-extension/public/manifest.json`
- `packages/browser-extension/vite.config.ts`
