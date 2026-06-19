# ADR-036: Fix Balance Persistence and UI Bugs from PR #3 Review

## Status
Accepted

## Context
A code review (PR #3, gemini-code-assist) identified four issues:

1. **Critical data bug**: `recalculateStatementBalances` computed running balances but never persisted them back to `bank_statement_items.balance`. After any add/update/delete operation, item balances in the database became stale.
2. **Logical error**: `scan-mapper.ts` used `||` for numeric fields (e.g. `price`), which incorrectly fell back to defaults when the value was `0` (a valid amount).
3. **UX bug**: `deleteItemMutation.isPending` was a global flag, causing all delete buttons in the list to show a loading spinner when any single item was being deleted.
4. **Typo**: Tailwind class `text-slate-505` in `CashFlowList.tsx` is not a valid utility, so sub-category labels rendered without the intended color.

## Decision

1. Added `updateItemBalance(itemId, balance)` to `StatementRepository` and its Supabase implementation — a lightweight single-column update avoiding the overhead of a full `updateItem` call. `recalculateStatementBalances` now calls this for every non-manual item inside the loop.
2. Replaced `||` with `??` (nullish coalescing) for all numeric fields in `mapReceiptResultToPayload` where `0` is a valid value.
3. Scoped the delete spinner to the item being processed using `deleteItemMutation.variables === item.id && deleteItemMutation.isPending`, leveraging TanStack Query's built-in `variables` tracking.
4. Corrected `text-slate-505` → `text-slate-500` in `CashFlowList.tsx`.

## Alternatives Considered

- **Batch balance update via a single DB call**: Would require a more complex upsert or RPC. The per-item approach is simpler and consistent with existing patterns; recalculation is infrequent.
- **Local state for pending item ID**: Would work but is redundant since TanStack Query already exposes `variables` on the mutation object.

## Consequences

- Item balances in `bank_statement_items` are now always accurate after any CRUD operation on statement items.
- No valid `0`-amount receipt items will be silently overwritten to a default.
- Only the targeted delete button shows a spinner; other items remain fully interactive.
- Sub-category labels render with the correct `text-slate-500` color.
- `recalculateStatementBalances` now issues N+1 DB writes (one per item). This is acceptable given that statement recalculation is a rare, user-triggered operation, not a hot path.

## Related Notes

- `frontend/lib/repositories/statements.ts` — new `updateItemBalance` method
- `frontend/features/bank-statements/actions/statements.ts` — `recalculateStatementBalances`
- `frontend/features/receipts/utils/scan-mapper.ts` — `mapReceiptResultToPayload`
- `frontend/features/bank-statements/components/BankStatementListView.tsx`
- `frontend/features/cash-flow/components/CashFlowList.tsx`
