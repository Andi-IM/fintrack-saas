# ADR-089: Add Cash Wallet Tools to MCP Server

## Status

Accepted

## Context

ADR-087 introduced the `cash_wallets` table for tracking physical cash holdings (dompet tunai), with a derived balance formula: `opening_balance + sum(income) - sum(expense)` over `cash_flow` entries whose `payment_method` matches the wallet name. The frontend exposes full CRUD via server actions and a management UI page.

However, the MCP server (ADR-063) had no tools for cash wallets. LLM agents and external MCP clients could query cash flow, bank statements, receipts, and analytics — but could not list, create, update, or delete cash wallets. This left the cash wallet feature inaccessible to AI-assisted workflows.

## Decision

Add a dedicated `mcp-server/src/tools/cash-wallets.ts` module exposing four MCP tools:

- `list_cash_wallets` — list all wallets for the target user, each enriched with a derived `current_balance` computed via the ADR-087 formula.
- `create_cash_wallet` — create a wallet with `name`, optional `opening_balance` (default 0), and optional `currency` (default IDR).
- `update_cash_wallet` — update `name`, `opening_balance`, or `currency` on an existing wallet.
- `delete_cash_wallet` — delete a wallet by UUID (does not delete associated `cash_flow` entries).

All tools follow existing MCP server conventions:
- Zod schema validation on inputs.
- `resolveTargetUserId` / `ensureUserFilter` for multi-tenant scoping.
- `formatSuccessResponse` / `formatErrorResponse` for consistent output.
- Ownership verification before update/delete.

The module is registered in `mcp-server/src/index.ts` alongside existing tool modules.

## Alternatives Considered

- **Reuse `list_cash_flow` with a `payment_method` filter**: Would show transactions but not the wallet entity, opening balance, or derived current balance. Rejected — does not expose the wallet as a first-class concept.
- **Add cash wallet tools to `cashflow.ts`**: Would work but mixes two distinct domains (transaction ledger vs. wallet positions) in one file. Rejected for clarity and maintainability.
- **Skip MCP exposure until `wallet_id` FK exists on `cash_flow`**: Would delay the feature unnecessarily. The name-matching derivation is already the accepted behavior per ADR-087. Rejected.

## Consequences

- Positive: LLM agents can now manage cash wallets (dompet tunai) programmatically via MCP.
- Positive: Consistent with existing tool patterns — no new architectural complexity.
- Trade-off: Balance derivation relies on `payment_method` matching wallet name (same limitation as ADR-087). Renaming a wallet orphans historical attribution.
- Trade-off: `delete_cash_wallet` does not cascade to `cash_flow` entries — this is intentional to preserve transaction history.

## Related Notes

- `mcp-server/src/tools/cash-wallets.ts`
- `mcp-server/src/index.ts`
- ADR-087 (cash wallet tracking), ADR-063 (dedicated MCP server)
- `supabase/migrations/20261006090000_create_cash_wallets.sql`
