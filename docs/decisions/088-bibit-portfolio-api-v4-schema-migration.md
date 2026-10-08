# ADR-088: Bibit Portfolio API v4 Schema Migration

## Status

Accepted

## Supersedes

None. Amends the capture contract established in ADR-076 (Bibit Portfolio Sync via Browser Extension) and the payload validation shared with ADR-078/082/083.

## Context

The browser extension captures the Bibit portfolio by passively intercepting the web client's network traffic on `app.bibit.id` (ADR-076). The interceptor and the sync endpoint both assumed the legacy **v3** response shape returned by `https://api.bibit.id/portfolios?v=4`:

```jsonc
{
  "data": {
    "marketvalue": 559327.83,
    "invested": 551477.03,
    "profitloss": 7850.8,
    "trading_balance": 98380,
    "result": [
      { "id": 1, "name": "Dana Tabungan", "marketvalue": 559327.83, "invested": 551477.03, "profitloss": 7850.8 }
    ]
  }
}
```

In production the extension stopped detecting the portfolio entirely. Investigation of the live traffic on `app.bibit.id` revealed Bibit had shipped a breaking API revision (**v4**):

1. **Portfolio endpoint changed** to `GET https://api.bibit.id/portfolios/category/<category_id>?v=4`. The response nests holdings two levels deeper:
   ```jsonc
   {
     "data": {
       "marketvalue": 559327.83,
       "invested": 551477.03,
       "profitloss": 7850.8,
       "results": [
         {
           "name": "Pasar Uang",
           "items": [
             {
               "marketvalue": 559327.83,
               "invested": 551477.03,
               "profitloss": 7850.8,
               "product": { "product_id": 832, "symbol": "RD832", "name": "Majoris Pasar Uang Syariah Indonesia", "group": "MUTUAL_FUND" }
             }
           ]
         }
       ]
     }
   }
   ```
2. **RDN cash balance moved** to a separate endpoint `GET https://api.bibit.id/rdn?v=3`, returned as `data.trading_balance` / `data.cash_on_hand`. It is no longer present on the portfolio response.

Consequences of the drift:
- The interceptor's `postMessage` relay never fired for the new host-path pattern (`/portfolios/category/...`), so no console log appeared on the Bibit page.
- Even when a payload was relayed, `isValidBibitPayload` required `data.result` to be an array, so the v4 `data.results` shape was rejected and the sync toast was suppressed.
- The backend `isValidPayload` in `POST /api/investments/sync/bibit` would have rejected the normalized-but-unflat payload for the same reason.

## Decision

Adopt a single **normalization boundary** that accepts both the legacy v3 and the current v4 shapes and converts them to one stable internal `BibitPayload` (`data.result[]`, flat). Both the extension and the backend apply the same normalization so either side can be updated independently.

1. **Extension interceptor (`packages/browser-extension/src/content/bibit-interceptor.ts`)**:
   - Classify responses by URL pattern: `/portfolios(/|\?|$)` → `portfolio`, `/rdn(/|\?|$)` → `rdn`, only for `bibit.id` hosts.
   - Relay either a portfolio or an RDN payload, tagging `source: 'bibit_api'` or `source: 'bibit_rdn'`.
   - Recognizability check accepts both `data.results` and `data.result` for portfolios, and `trading_balance`/`cash_on_hand`/`withdrawal_balance` for RDN.

2. **Shared normalization (`packages/browser-extension/src/shared/validation.ts`)**:
   - `normalizeBibitPayload(raw)` flattens v4 `data.results[].items[]` (emitting `id` from `product.product_id` or `symbol`, plus `symbol`/`group`/`name`) and passes through legacy `data.result[]`.
   - `normalizeRdnBalance(raw)` extracts the cash balance from the `/rdn` response, falling back through `trading_balance` → `cash_on_hand` → `withdrawal_balance`.
   - `isValidBibitPayload`/`isValidRdnPayload` are thin wrappers over the normalizers.

3. **Content script (`packages/browser-extension/src/content/bibit-content.ts`)**:
   - Cache the latest normalized portfolio and the latest RDN balance separately, then merge (`data.trading_balance`) into the payload shown in the toast and POSTed to FinTrack.

4. **Backend endpoint (`frontend/app/api/investments/sync/bibit/route.ts`)**:
   - Replace the strict `isValidPayload` with a `normalizePayload` that accepts either the already-normalized payload from the extension, the legacy flat shape, or a raw v4 `results` payload.
   - Use `item.symbol` (Bibit mutual-fund/stock code) for the holding symbol (`BIBIT-<symbol>`) when present, falling back to `BIBIT-<id>`, and `item.group` for the display name suffix. Account/asset classification uses `group === 'stock'` or a "saham" name match.

## Alternatives Considered

- **Match only the new v4 endpoints and drop legacy support**: Rejected — users on cached/older clients and any Bibit A/B rollout may still emit the legacy shape; supporting both at the normalization boundary is cheap and avoids a second regression.
- **Parse portfolio and RDN only on the backend**: Rejected — the extension must still recognize the payload to show the detection toast and cache data before the user opts to sync; normalization is needed client-side regardless.
- **Scrape the rendered DOM instead of the network**: Rejected — DOM scraping is far more brittle than the JSON API contract and was never the chosen approach (ADR-076).
- **Pin to a specific Bibit API version query param**: Rejected — Bibit controls the path/version; we cannot request an older schema.

## Consequences

**Positive**:
- Portfolio detection and sync work again on the current Bibit web client.
- One normalization function per side keeps validation, caching, and ingestion consistent and independently testable.
- Legacy and v4 payloads both pass, so the change is backwards compatible.

**Trade-offs / Risks**:
- This is the second schema drift from Bibit; the contract remains unofficial and may change again. The `MAX_RESULT_ITEMS`/`MAX_AMOUNT` guards and "unrecognizable payload" rejection keep failures safe (no toast, no partial write) rather than corrupting data.
- Holdings are now keyed by `BIBIT-<symbol>` when a symbol exists. Existing rows created under the legacy `BIBIT-<id>` key are matched by account heuristics but may need a one-time reconciliation if both keys persist for the same product.

## Related Notes

- Amends ADR-076: Bibit Portfolio Sync via Browser Extension
- Relates to ADR-078 (CORS), ADR-082 (refresh-token auth), ADR-083 (API key auth)
- `packages/browser-extension/src/content/bibit-interceptor.ts`
- `packages/browser-extension/src/content/bibit-content.ts`
- `packages/browser-extension/src/shared/validation.ts`
- `frontend/app/api/investments/sync/bibit/route.ts`
