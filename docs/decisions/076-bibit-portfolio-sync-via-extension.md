# ADR-076: Bibit Portfolio Sync via Browser Extension

## Status

Accepted

## Context

Users invest in mutual funds, stocks, and bonds via Bibit (https://app.bibit.id). While manual transaction entry is available in FinTrack, users requested automated capture of their Bibit portfolio through the browser extension.

When a user browses `https://app.bibit.id`, the Bibit web client requests `https://api.bibit.id/portfolios?v=4` returning:
- Total portfolio market value, invested cost, profit/loss, pending amounts, and trading balance (RDN).
- Detailed portfolio buckets (`result` array: "Dana Tabungan", "Dana Darurat", "Bibit Saham", etc.).

## Decision

1. **Extension Main-World Network Interception**:
   - Register a content script for `https://app.bibit.id/*` in `packages/browser-extension/public/manifest.json`.
   - Inject a lightweight interceptor into `world: "MAIN"` that wraps `window.fetch` and `XMLHttpRequest`.
   - When an API response from `api.bibit.id/portfolios` is received, clone and extract the portfolio JSON data.
   - Relay the extracted payload via `window.postMessage` to the isolated content script.

2. **User Notification & Sync in Extension**:
   - The isolated content script displays a discreet toast notification on `app.bibit.id`:
     *"FinTrack: Portofolio Bibit terdeteksi (Rp [Market Value]). [Sinkronkan ke FinTrack]"*
   - Stores the latest captured Bibit payload in `chrome.storage.local` (`fintrack_bibit_portfolio`).
   - Sends the payload to FinTrack backend endpoint `POST /api/investments/sync/bibit`.

3. **Backend Ingestion Endpoint (`/api/investments/sync/bibit`)**:
   - Validates the Bibit portfolio payload schema.
   - Upserts the investment account for Bibit (broker = "Bibit", type = "mutual_fund" / "stock").
   - Updates account balances (total value, total cost, gain/loss) and RDN cash balance.
   - Refreshes the daily portfolio snapshot (`portfolio_snapshots`).

4. **Web App Broker Import Support**:
   - Add a Bibit import / sync action in the web app under `/investments/accounts` to allow direct payload import or view last synced status.

## Consequences

**Positive**:
- Zero-friction portfolio sync without manual entry of each mutual fund or transaction.
- Safe, read-only passive interception of legitimate user traffic on `app.bibit.id` (no credential theft or intrusive automation).
- Always syncs accurate NAV market values and RDN cash.

**Trade-offs / Risks**:
- Changes to Bibit's internal API schema could require parser updates. Payload validation with fallback guarantees resilience.

## Related Notes

- ADR-074: Investment Portfolio Tracking & Browser Extension
- ADR-075: Independent Investment Feature and Direct Extension Launcher
- `packages/browser-extension/src/content/bibit-interceptor.ts`
- `packages/browser-extension/src/content/bibit-content.ts`
- `frontend/app/api/investments/sync/bibit/route.ts`
