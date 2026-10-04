# ADR-075: Independent Investment Feature and Direct Extension Launcher

## Status

Accepted

## Supersedes

ADR-074 (Section 5: Extension popup and content script widget)

## Context

In ADR-074, investment portfolio tracking was introduced along with a browser extension. However, the initial rollout suffered from two key structural issues:

1. **Popup Over Feature**: Investment was surfaced primarily as a browser extension toolbar popup (`default_popup`) and an injected floating content script widget on `fintrek.web.id`. It was absent from the web app's main sidebar navigation and mobile bottom nav, making it feel like an ephemeral popup rather than a core financial capability.
2. **Route Location Defect**: Investment routes were unintentionally placed under a malformed path `app/(dashboard/)/investments/` instead of `app/(dashboard)/investments/`, making the feature inaccessible from standard routing and navigation.

Users requested that investment not be displayed as a popup, but rather exist as an independent, fully integrated core feature of the FinTrack web application.

## Decision

1. **Independent First-Class Web Feature**:
   - Establish `/investments` as a dedicated top-level section in the FinTrack web app, housing Overview, Accounts, Holdings, Transactions, and Settings.
   - Relocate all investment routes cleanly into `frontend/app/(dashboard)/investments/`.
   - Update Server Components to directly invoke the investment server action (`getInvestmentOverview`) rather than issuing loopback HTTP `fetch` calls to `localhost`.

2. **Core Navigation Integration**:
   - Add "Investments" to the desktop Sidebar (`frontend/components/layout/Sidebar.tsx`) using the `TrendingUp` icon, positioned alongside core financial modules.
   - Add "Investasi" to the mobile bottom navigation (`frontend/components/layout/BottomNav.tsx`).
   - Register `'investments'` in `NavigationSection` within `frontend/components/layout/navigation.ts`, supporting nested breadcrumbs for accounts, holdings, transactions, and settings.
   - Update navigation unit tests (`frontend/components/layout/__tests__/navigation.test.ts`).

3. **Dashboard Integration**:
   - Add an Investment Portfolio summary card to the main Dashboard (`frontend/app/(dashboard)/page.tsx`), showing current portfolio value, day change, and quick action to access the full investment hub.

4. **Extension Transformation**:
   - Remove `default_popup` from `packages/browser-extension/public/manifest.json`.
   - Remove the injected floating widget content script from `packages/browser-extension/src/content/index.ts` and manifest `content_scripts`.
   - Configure `chrome.action.onClicked` in `packages/browser-extension/src/background/index.ts` so clicking the extension toolbar icon opens `https://fintrek.web.id/investments` directly in a new browser tab.
   - Retain background service worker badge updates and price alerts to keep toolbar utility high without popup friction.

## Alternatives Considered

- **Retain toolbar popup while adding web navigation**: Rejected because maintaining two divergent UI surfaces for the same portfolio tracking creates maintenance overhead and user confusion.
- **Keep floating widget with a hide toggle**: Rejected because floating overlays interfere with responsive dashboard views and user explicitly asked not to show investment as a popup.

## Consequences

**Positive**:
- Consistent, native user experience across desktop and mobile browsers.
- Investment is easily discoverable through the sidebar and dashboard.
- Eliminates page clutter caused by injected DOM elements.
- Extension becomes a lightning-fast one-click launcher to the full feature.

**Trade-offs / Risks**:
- Extension no longer previews data inside a 360px popup; users view the rich web app instead (which provides better charts, tables, and interaction).

## Related Notes

- ADR-074: Investment Portfolio Tracking & Browser Extension
- ADR-033: Migrate to Feature-Based Architecture
- `frontend/components/layout/Sidebar.tsx`
- `frontend/components/layout/BottomNav.tsx`
- `frontend/components/layout/navigation.ts`
- `packages/browser-extension/public/manifest.json`
- `packages/browser-extension/src/background/index.ts`
