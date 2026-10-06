# ADR-087: Manual Cash Wallet Tracking

## Status

Accepted

## Context

FinTrack currently tracks money that lives in banks. Bank balances are derived from
uploaded bank statements (`bank_statements.opening_balance` / `closing_balance` and the
per-item running `balance` on `bank_statement_items`). The unified ledger `cash_flow`
records every money movement, and the "source of funds" is a free-text
`cash_flow.payment_method` (e.g. `Tunai`, `Bank JAGO`, `Gopay`).

There is no first-class representation of physical cash (uang tunai). A user can mark an
entry with `payment_method = 'Tunai'`, but there is no way to:

- record how much cash the user is holding (no opening balance for cash),
- see a running cash balance separate from bank balances,
- reconcile manual cash entries against a declared cash position.

The existing `investment_accounts` table is the only typed "account" entity, and it is
scoped to investments only (stock/mutual_fund/crypto/gold/other). Building a bank-account
abstraction is out of scope for this request.

## Decision

Introduce a dedicated `cash_wallets` table for tracking physical cash holdings.

- A wallet has a user-chosen `name`, a `currency` (default `IDR`), and an explicit
  `opening_balance` representing the cash held when the wallet was created.
- The current cash balance is **derived**, not stored: 
  `balance = opening_balance + sum(income) - sum(expense)` over `cash_flow` entries whose
  `payment_method` matches the wallet name and whose `date >= wallet.created_at`.
- Wallet names are surfaced in the `cash_flow.payment_method` dropdown so entries are
  attributed to a wallet by name (consistent with how bank names are already free-text).
- A `cash_wallets` TypeScript interface, repository (Supabase + fake), server actions, and
  a management UI page follow the established feature-based + repository patterns
  (ADR-033, ADR-047).
- The dashboard gains a cash-balance summary card alongside the investment card.

This keeps `cash_flow` as the single source of truth for movements while adding the missing
opening position and a dedicated view for cash.

## Alternatives Considered

- **Generalized typed accounts (bank + cash + e-wallet)**: Model a single `accounts` table
  with a `type` enum and migrate `bank_statements` / `cash_flow` to reference it. More
  future-proof but requires a large refactor of statements, analytics, RLS, and existing
  free-text `payment_method` / `bank_name` usage. Rejected for this iteration; can be
  superseded later.
- **Derive cash purely from the ledger (no new table)**: Sum `income - expense` for
  `payment_method = 'Tunai'`. No migration needed, but cannot represent an opening cash
  balance (cash on hand before FinTrack existed) and cannot support multiple wallets.
  Rejected.
- **Store a running balance column on the wallet**: Would require triggers/backfills on
  every `cash_flow` write, duplicating data that is already derivable. Rejected for the
  same reason running balances were removed elsewhere (ADR-037).

## Consequences

- Cash becomes a first-class tracked position with an explicit opening balance.
- Balance derivation depends on wallet name matching `cash_flow.payment_method`; renaming a
  wallet orphans historical attribution (documented behavior). A future iteration may add a
  `wallet_id` FK on `cash_flow`.
- The feature is additive: no existing tables, columns, or statement logic are modified.
- RLS mirrors existing user-owned tables and reuses the `private.set_user_id()` trigger.

## Related Notes

- `supabase/migrations/20261006090000_create_cash_wallets.sql`
- `frontend/lib/repositories/cash-wallets.ts`, `frontend/lib/repositories/types.ts`
- `frontend/features/cash-wallets/actions/cash-wallets.ts`
- `frontend/app/(dashboard)/cash-wallets/`
- ADR-033 (feature-based architecture), ADR-047 (repository pattern),
  ADR-052 (production RLS), ADR-037 (balance persistence)
