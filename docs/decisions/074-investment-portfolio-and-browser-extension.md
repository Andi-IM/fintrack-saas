# ADR-074: Investment Portfolio Tracking & Browser Extension

## Status

Proposed

## Context

FinTrack currently tracks cash flow (manual transactions + parsed bank statements) and computes "Net Worth" as the sum of latest bank closing balances. Users have requested:

1. **Investment portfolio tracking** — stocks (IDX), mutual funds (reksa dana), crypto, gold, etc. with buy/sell transactions, dividend tracking, NAV history, and performance metrics (XIRR, time-weighted return)
2. **Browser extension** — a Chrome/Edge extension (Manifest V3) that shows investment summary (total value, day change, top holdings) when logged into the FinTrack web app, without opening a new tab

The extension must share authentication with the main app (Supabase Auth) and fetch data via a dedicated API endpoint.

## Decision

### 1. Database Schema (New Tables)

```sql
-- Core investment tables
CREATE TABLE investment_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                    -- e.g., "Bibit", "Stockbit", "Tokocrypto", "Pluang"
  type TEXT NOT NULL CHECK (type IN ('stock', 'mutual_fund', 'crypto', 'gold', 'other')),
  broker TEXT,                           -- optional broker name
  currency TEXT NOT NULL DEFAULT 'IDR',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE investment_holdings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES investment_accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,                  -- e.g., "BBCA", "BBRI", "SCHD", "BTC", "XAU"
  name TEXT NOT NULL,                    -- full name
  asset_class TEXT NOT NULL CHECK (asset_class IN ('equity', 'fixed_income', 'crypto', 'commodity', 'cash', 'other')),
  quantity NUMERIC(24, 8) NOT NULL DEFAULT 0,
  avg_buy_price NUMERIC(24, 8),          -- weighted average cost basis
  currency TEXT NOT NULL DEFAULT 'IDR',
  metadata JSONB DEFAULT '{}',           -- flexible: sector, ISIN, contract_address, etc.
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (account_id, symbol)
);

CREATE TABLE investment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  holding_id UUID NOT NULL REFERENCES investment_holdings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('buy', 'sell', 'dividend', 'split', 'merge', 'transfer_in', 'transfer_out', 'fee', 'interest', 'staking_reward', 'airdrop')),
  quantity NUMERIC(24, 8) NOT NULL,
  price NUMERIC(24, 8) NOT NULL,         -- price per unit in holding currency
  fees NUMERIC(24, 8) DEFAULT 0,
  taxes NUMERIC(24, 8) DEFAULT 0,
  total_amount NUMERIC(24, 8) GENERATED ALWAYS AS (quantity * price + fees + taxes) STORED,
  transaction_date TIMESTAMPTZ NOT NULL,
  settlement_date TIMESTAMPTZ,
  notes TEXT,
  external_id TEXT,                      -- broker transaction ID for deduplication
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE investment_price_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol TEXT NOT NULL,
  asset_class TEXT NOT NULL,
  price NUMERIC(24, 8) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'IDR',
  source TEXT NOT NULL,                  -- 'idx', 'bibit', 'coingecko', 'goldprice', 'manual'
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (symbol, asset_class, source, timestamp)
);

CREATE TABLE portfolio_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_value NUMERIC(24, 2) NOT NULL,
  total_cost NUMERIC(24, 2) NOT NULL,
  total_gain_loss NUMERIC(24, 2) GENERATED ALWAYS AS (total_value - total_cost) STORED,
  total_gain_loss_pct NUMERIC(10, 4) GENERATED ALWAYS AS (CASE WHEN total_cost > 0 THEN (total_value - total_cost) / total_cost * 100 ELSE 0 END) STORED,
  day_change NUMERIC(24, 2),
  day_change_pct NUMERIC(10, 4),
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, snapshot_date)
);

-- Indexes
CREATE INDEX idx_investment_accounts_user ON investment_accounts(user_id);
CREATE INDEX idx_investment_holdings_account ON investment_holdings(account_id);
CREATE INDEX idx_investment_holdings_user ON investment_holdings(user_id);
CREATE INDEX idx_investment_transactions_holding ON investment_transactions(holding_id);
CREATE INDEX idx_investment_transactions_user_date ON investment_transactions(user_id, transaction_date DESC);
CREATE INDEX idx_investment_price_snapshots_symbol_date ON investment_price_snapshots(symbol, asset_class, timestamp DESC);
CREATE INDEX idx_portfolio_snapshots_user_date ON portfolio_snapshots(user_id, snapshot_date DESC);
```

### 2. RLS Policies

All tables: `user_id = auth.uid()` for SELECT/INSERT/UPDATE/DELETE. Enable RLS on all tables.

### 3. Server Actions (lib/actions/investments.ts)

- `getInvestmentOverview()` → returns aggregated portfolio: total value, cost, gain/loss, day change, per-account breakdown, top 5 holdings
- `getInvestmentAccounts()` → list accounts with holdings summary
- `getHoldingsByAccount(accountId)` → detailed holdings with current price, market value, gain/loss
- `getTransactionsByHolding(holdingId)` → paginated transaction history
- `createInvestmentAccount(data)`, `updateInvestmentAccount(id, data)`, `deleteInvestmentAccount(id)`
- `createHolding(data)`, `updateHolding(id, data)`, `deleteHolding(id)`
- `createTransaction(data)`, `updateTransaction(id, data)`, `deleteTransaction(id)`
- `recalculateHoldingAvgPrice(holdingId)` → recomputes avg_buy_price from transactions (FIFO or weighted average)
- `refreshPortfolioSnapshot(userId)` → computes and upserts daily portfolio_snapshot

### 4. Price Ingestion (Background Jobs)

- **IDX Stocks**: Use `yfinance` or local CSV from IDX daily data; cron every 15 min during trading hours (09:00–15:00 WIB)
- **Mutual Funds (Reksa Dana)**: Scrape NAV from Bibit/Bareksa/Infovesta APIs; cron daily 17:00 WIB
- **Crypto**: CoinGecko API (free tier); cron every 5 min
- **Gold**: Goldprice.org or Antam/LPG websites; cron hourly
- Store in `investment_price_snapshots`; holdings current price = latest snapshot for symbol

### 5. Browser Extension (Manifest V3)

**Location**: New workspace package `packages/browser-extension` (pnpm monorepo)

**Architecture**:
- **Popup** (`popup.html` + `popup.tsx`): Shows investment summary card — total value, day change (%), top 3 holdings, "Open FinTrack" button
- **Content Script** (optional): Injects a floating widget on `app.fintrack.com` dashboard corner (user toggleable)
- **Background Service Worker**: Handles auth token refresh, periodic data fetch (every 5 min), badge updates
- **Auth**: Uses Supabase Auth PKCE flow; stores `access_token` + `refresh_token` in `chrome.storage.session` (encrypted via `chrome.storage.local` with user passphrase or OS keychain). Shares session with main app via `supabase.auth.setSession()` when popup opens.

**API Endpoint for Extension**:
- `GET /api/extension/portfolio-summary` — returns minimal JSON for popup (no HTML). Protected by Supabase JWT (Authorization: Bearer). Rate limited: 30 req/min per user.

**Permissions**:
```json
{
  "permissions": ["storage", "identity", "alarms"],
  "host_permissions": ["https://*.fintrack-saas.vercel.app/*", "https://*.supabase.co/*"],
  "optional_host_permissions": ["https://app.fintrack-saas.vercel.app/*"]
}
```

### 6. Frontend Integration (Next.js App)

- New route group: `app/(dashboard)/investments/` with pages: `overview`, `accounts`, `holdings/[id]`, `transactions`, `settings`
- Components: `PortfolioSummaryCards`, `HoldingsTable`, `TransactionChart` (Recharts), `AssetAllocationChart` (pie/donut), `PerformanceChart` (time-weighted return)
- Reuse existing patterns: `useQuery` + server actions, shadcn/ui `Card`/`Table`/`Dialog`, Zod validation
- Add "Investments" to sidebar navigation (after "Statements")

### 7. Net Worth Redefinition

Update `getStatementAnalytics()` (ADR-019) and dashboard overview to include investment portfolio value:
```
Total Net Worth = Sum(Bank closing_balances) + Investment Portfolio Total Value
```

### 8. Testing

- Unit tests for calculation helpers: `calculateXIRR()`, `calculateTWR()`, `calculateAvgBuyPrice()`
- Integration tests for server actions with fake Supabase
- E2E tests for CRUD flows (Playwright)
- Extension tests: popup rendering, auth flow, API fetch (Vitest + webextension-polyfill mock)

## Alternatives Considered

- **Single "investments" table with JSONB type discriminator**: Rejected — query complexity for holdings/transactions per asset class; relational model enables FK constraints and efficient indexes.
- **Separate price service (microservice)**: Rejected — overkill for MVP; cron jobs in Supabase Edge Functions or GitHub Actions sufficient.
- **Extension reads from localStorage**: Rejected — security risk; tokens must be in `chrome.storage.session` with encryption.
- **Extension as standalone app (no shared auth)**: Rejected — user friction; must share Supabase session.
- **Manifest V2**: Rejected — deprecated; Chrome Web Store requires MV3.

## Consequences

**Positive**:
- Complete investment tracking integrated with existing cash flow
- Real-time portfolio value in browser toolbar
- Extensible schema for future asset classes (bonds, P2P, property)
- Price ingestion decoupled from user-facing actions

**Negative/Trade-offs**:
- New schema adds 6 tables + indexes; migration required
- Price ingestion cron jobs need monitoring (GitHub Actions / Supabase pg_cron)
- Extension adds maintenance surface (Chrome Web Store review, MV3 updates)
- Real-time price APIs have rate limits; need caching layer
- XIRR/TWR calculations are CPU-intensive; compute in background job, store in `portfolio_snapshots`

**Risks**:
- Indonesian market data sources (IDX, reksa dana) may change APIs without notice → build adapter pattern for price providers
- Supabase Auth token refresh in extension background worker must handle network failures gracefully
- Extension content script injection on `app.fintrack.com` may break on CSP changes

## Implementation Plan

| Phase | Tasks |
|-------|-------|
| **1. Schema & Migration** | Create migration SQL, run locally, generate types (`supabase gen types typescript`) |
| **2. Server Actions** | Implement all CRUD + analytics actions in `lib/actions/investments.ts` |
| **3. Price Ingestion** | Write Edge Functions for each asset class; deploy to Supabase; schedule via `pg_cron` or GitHub Actions |
| **4. Frontend Pages** | Build investment feature under `app/(dashboard)/investments/`; update sidebar |
| **5. Net Worth Integration** | Modify `getStatementAnalytics()` and dashboard to include portfolio value |
| **6. Browser Extension** | Scaffold `packages/browser-extension` (Vite + React + TypeScript + webextension-polyfill); implement popup, background, auth, API client |
| **7. Testing** | Unit/integration/E2E for app; unit for extension popup; manual test extension auth flow |
| **8. Deploy** | Publish extension to Chrome Web Store (developer account); update CI for extension build |

## Related Notes

- ADR-019: Bank Statement Analytics (net worth redefinition)
- ADR-033: Feature-Based Architecture (new `features/investments` directory)
- ADR-052: Production RLS Implementation (apply same patterns)
- `supabase/migrations/` — new migration file needed
- `packages/browser-extension/` — new workspace package