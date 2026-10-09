# ADR-090: Link Cash Flow Entries to Wallets via wallet_id Foreign Key

## Status

Proposed

## Context

ADR-087 introduced `cash_wallets` with a derived balance:
`opening_balance + sum(income) - sum(expense)` over `cash_flow` entries whose
`payment_method` matches the wallet name exactly and whose `date >= wallet.created_at`.
ADR-089 exposed the same derivation to MCP agents.

This name-matching bridge is fragile in practice. An operational incident on 2026-10-08
confirmed all three failure modes:

1. **No dedicated link.** `cash_flow` has no `wallet_id` column, and
   `create_cash_flow_entry` / `update_cash_flow_entry` have no `wallet` parameter. The only
   join key is the free-text `payment_method` string, which must equal the wallet name
   character-for-character.
2. **The "Cash" convention breaks the chain.** All historical cash entries (98 rows) use
   `payment_method = 'Cash'`, which never matches the wallet name `Dompet Utama`, so the
   wallet balance stayed at the opening baseline and silently ignored new cash spending.
3. **Manual repair is error-prone.** Fixing the balance required retyping `payment_method`
   on exactly the two post-baseline transactions (gas −43,000; breakfast cake −7,000).
   Bulk-renaming all `'Cash'` rows would double-count against the 186,000 opening baseline
   (which was itself reconciled from a manual adjustment entry dated before wallet creation).
   Nothing in the schema prevents an agent or user from making that mistake.

Secondary risks: renaming a wallet orphans all historical attribution (documented in
ADR-087 "Consequences"), and the wallet-name↔payment-method coupling makes e-wallet or
per-wallet analytics impossible without string heuristics.

## Decision

Add a nullable `wallet_id` foreign key to `cash_flow` and make it the primary wallet link,
with name matching retained only as a legacy fallback.

1. **Schema**: `ALTER TABLE public.cash_flow ADD COLUMN wallet_id UUID REFERENCES
   public.cash_wallets(id) ON DELETE SET NULL` plus an index on `(user_id, wallet_id)`.
   A CHECK-enforced invariant is not feasible cross-table under RLS; ownership consistency
   is validated in the application layer (repository + MCP tools) instead.
2. **Derivation**: wallet balance becomes
   `opening_balance + sum(income) - sum(expense)` over entries where
   `wallet_id = wallet.id OR (wallet_id IS NULL AND payment_method = wallet.name)`,
   still filtered by `date >= wallet.created_at`. The `created_at` floor stays: it is what
   makes the opening balance a safe baseline.
3. **Write path**: `create_cash_flow_entry` and `update_cash_flow_entry` (MCP) and the
   frontend cash-flow form accept an optional `wallet` identifier (wallet name or UUID,
   resolved server-side). When a wallet is set, the tool also syncs `payment_method` to the
   wallet name so single-source string-based views (analytics, statement sync) stay
   consistent. Renaming a wallet (`update_cash_wallet`) cascades: update
   `cash_flow.payment_method` where `wallet_id = old wallet id`, preserving both linked and
   legacy display attribution.
4. **Backfill**: no automatic migration of the 98 historical `'Cash'` rows. They predate
   any wallet baseline and backfilling them would corrupt derived balances (same
   double-count trap as the incident). A one-shot, explicit, user-confirmed backfill helper
   may be added later; the default is legacy fallback matching.
5. **Read path**: `list_cash_flow` and `list_cash_wallets` return `wallet_id`/`wallet_name`
   so agents no longer need to infer linkage from strings.

## Alternatives Considered

- **Strict name convention only (document "always type the exact wallet name")**: Zero
  migration, but keeps every failure mode of the incident — silent misses, rename
  orphaning, and baseline double-count risk. Rejected: the incident proved agents and users
  do not follow the convention.
- **Backfill `wallet_id` for all `'Cash'` rows to `Dompet Utama`**: Creates the exact
  double-count the incident warned about (opening balance 186,000 already includes all cash
  on hand before 2026-10-08). Rejected.
- **Store running balance column with triggers**: Rejected by ADR-087 precedent (see also
  ADR-037): duplicates derivable data and adds write-path complexity.
- **Generalized `accounts` table (bank + cash + e-wallet) with FK from `cash_flow`**:
  The long-term correct model, but a large refactor of `bank_statements`, statement-sync
  triggers, analytics, and RLS. Rejected for this iteration; `wallet_id` is designed so it
  can be superseded by `account_id` later (see ADR-087 alternatives).

## Consequences

- Positive: wallet attribution survives wallet renames and payment-method typos; MCP agents
  get an explicit `wallet` parameter instead of relying on exact string equality.
- Positive: closes the silent-undercount failure observed in the incident while keeping the
  baseline-safe `date >= created_at` semantics.
- Trade-off: two linkage mechanisms coexist (FK primary, name fallback for legacy rows);
  derivation queries gain one OR branch. Mitigated by syncing `payment_method` on every
  wallet-resolved write so the fallback set shrinks over time.
- Trade-off: `ON DELETE SET NULL` keeps transaction history when a wallet is deleted, but
  those entries then rely on name fallback — consistent with ADR-089's non-cascading delete.
- Risk: application-layer ownership checks must be applied everywhere `wallet_id` is
  written (frontend actions, MCP tools, receipt sync); a missed check could link an entry
  to another user's wallet. Covered by repository-level validation tests.
- Implication: add RLS-safe index + column to a new migration; regenerate Supabase types
  (`update-types.js`) and fake repositories/e2e fixtures.

## Related Notes

- Supersedes/extends: ADR-087 (cash wallet tracking, "future iteration may add `wallet_id`
  FK"), ADR-089 (MCP cash wallet tools)
- `supabase/migrations/20261006090000_create_cash_wallets.sql`
- `mcp-server/src/tools/cash-wallets.ts` (`deriveWalletBalance`), `mcp-server/src/tools/cashflow.ts`
- `frontend/features/cash-flow/components/CashFlowForm.tsx`,
  `frontend/lib/repositories/cash-wallets.ts`
- Incident evidence (2026-10-08): wallet `Dompet Utama` created 04:04:52Z with
  `opening_balance = 186,000`; post-baseline `'Cash'` entries gas −43,000 and cake −7,000
  were manually relabeled to `Dompet Utama` → derived balance 136,000.
