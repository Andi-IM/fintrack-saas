# ADR-018: Standardize Server Action Response Pattern with Discriminated Unions

## Status
Accepted

## Supersedes
The implicit "throw errors or return null/false" pattern from ADR-005 (Refactor to Next.js App Router Best Practices). ADR-005 established Server Actions as the mechanism for mutations but did not specify a return-type contract. This ADR supplies that contract.

## Context
Server Actions (ADR-005) are the project's standard mechanism for all Supabase mutations. However, the original actions used a mixed pattern: some returned `null` / `false` on failure (`insertTransaction`, `updateTransaction`, `deleteTransaction`), others threw `Error` objects (`scanDocumentWithAI`, `saveBankStatement`, `getFileUrl`, `getGroupedBankStatements`). Client callers had to handle both `try/catch` and return-value checks inconsistently.

This caused several problems:
1. **Thrown errors in Server Actions trigger the Next.js `error.tsx` Error Boundary**, which is designed for unexpected failures—not expected validation errors. A duplicate statement upload or invalid form input should show an inline message, not a full error page.
2. **No input validation layer** existed before data reached Supabase. Malformed payloads either hit Supabase constraints (producing cryptic errors) or silently inserted bad data.
3. **No field-level error reporting**. Callers could not distinguish "this field is wrong" from "the whole request failed."
4. **TypeScript could not narrow the success/failure path**, so every caller needed manual type guards or assumed success.

The staged changes address all four problems in one sweeping pattern change.

## Decision
All Server Actions will return a `ActionResponse<T>` discriminated union type:

```typescript
export type ActionResponse<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> }
```

**Rules enforced by this ADR:**
1. **Every mutation Server Action** (`'use server'` in `lib/actions/`) returns `Promise<ActionResponse<T>>`.
2. **Actions never throw** business-logic errors. Only truly unexpected failures (Supabase down, network error) may throw, and those hit the Error Boundary as intended.
3. **Input validation with Zod** precedes every mutation. Basic schema shape & type validation lives in the action file; domain-specific checks (duplicate detection, overlap detection) stay inline.
4. **Client components check `result.success`** — no `try/catch` around Server Action calls for expected errors.
5. **Data-fetching actions** (`getTransactions`, `getGroupedBankStatements`) may return `ActionResponse` when the caller needs to distinguish "empty" from "error". Simple fetches may still return raw data when the caller treats any failure as an error-boundary case.

## Alternatives Considered
- **Keep throwing errors, add a client-side error-boundary bypass**: Rejected. It requires every caller to wrap in `try/catch`, adds mental overhead, and doesn't give callers field-level error data.
- **Return `{ data, error }` tuples (Go-style)**: Rejected due to verbosity. The discriminated union with `.success` is more idiomatic TypeScript and enables type-narrowing.
- **Use Next.js `toast` for all errors**: Rejected. Critical validation errors (duplicate statements, invalid form data) demand inline feedback, not ephemeral toasts.

## Consequences
- **Positive**: Consistent caller pattern — `if (!result.success)` everywhere, no surprise Error Boundary triggers.
- **Positive**: Zod schemas provide a single source of truth for input shapes; field errors reach UI directly.
- **Positive**: TypeScript narrows types automatically on `result.success` check.
- **Positive**: All 11 affected files changed in one commit; pattern is now established for new actions.
- **Trade-off**: Actions must explicitly construct response objects instead of relying on exceptions. This is slightly more verbose but measurably safer.
- **Trade-off**: Fetching actions that return `ActionResponse` require callers to unwrap `.data`. The original pattern returned data directly, which was simpler for Server Components.

## Implementation Plan
The pattern is already implemented in the staged changes. Future actions must follow these rules:

- **New Server Action files**: Add `import { ActionResponse } from './types'` and return `Promise<ActionResponse<T>>`.
- **Input validation**: Create a Zod schema at the top of the action file. Parse with `.safeParse()`. Return `{ success: false, error: '...', fieldErrors }` on failure.
- **No throw**: Replace `throw new Error(...)` with `return { success: false, error: '...' }`.
- **Client callers**: Use `if (!result.success) { /* handle */ return }` — never `try/catch` around expected Server Action calls.
- **Code references**: Add `// ADR-018: docs/decisions/018-standardize-server-action-response-pattern.md` comments at the entry point of each action file and in `lib/actions/types.ts`.
- **Affected paths**:
  - `lib/actions/types.ts` — new file, the `ActionResponse<T>` type definition
  - `lib/actions/ocr.ts` — refactored: `scanDocumentWithAI` returns `ActionResponse<OCRResult>`, Zod input validation added
  - `lib/actions/statements.ts` — refactored: all 4 functions return `ActionResponse`, Zod validation on `saveBankStatement`
  - `lib/actions/transactions.ts` — refactored: `insertTransaction`, `updateTransaction`, `deleteTransaction` return `ActionResponse`, Zod validation added; `getTransactions` kept as raw data return (exempt per Rule 5)
  - `lib/actions/auth.ts` — exempt: `login`/`logout` use `redirect()` for control flow
  - `components/transactions/BankStatementList.tsx` — updated: `getGroupedBankStatements`, `deleteBankStatement`, `getFileUrl` callers use `.success` check
  - `components/transactions/ScanDialog.tsx` — updated: `scanDocumentWithAI`, `insertTransaction`, `saveBankStatement` callers use `.success` check
  - `components/transactions/TransactionForm.tsx` — updated: `insertTransaction`, `updateTransaction` callers use `.success` check; server error displayed inline
  - `components/transactions/TransactionList.tsx` — updated: `deleteTransaction` caller uses `.success` check
  - `lib/ocr/processor.ts` — cleaned up: docTR routing logic moved into `DoctrOcrExtractor.canHandle()`
  - `lib/ocr/doctr.ts` — updated: self-selects based on filename + `OCR_SERVICE_URL` env var
  - `lib/ocr/bank-statement-parser.ts` — fixed: fallback parser no longer silently falls through

## Verification
All checks are automated in `frontend/scripts/verify-adr-018.sh`. Run with `npm run verify:adr-018`:

- [x] Every mutation `'use server'` function returns `Promise<ActionResponse<T>>` (auth actions exempt).
- [x] No `throw new Error(...)` in any Server Action for business-logic failures.
- [x] Every mutation action has a corresponding Zod schema validated via `.safeParse()`.
- [x] No `try/catch` wrapping a Server Action call in a client component (except for truly unexpected errors).
- [x] All named actions (`scanDocumentWithAI`, `insertTransaction`, `updateTransaction`, `deleteTransaction`, `saveBankStatement`, `deleteBankStatement`, `getFileUrl`, `getGroupedBankStatements`, `getTransactions`, `login`, `logout`) conform or are explicitly exempt.

## Non-Goals
- This ADR does NOT mandate that data-fetching actions (e.g., `getTransactions`) return `ActionResponse`. Fetching actions may return raw data when the caller treats any failure as an error-boundary case (Rule 5).
- This ADR does NOT change auth actions (`login`, `logout`) — they use `redirect()` for control flow, which is a different pattern.
- This ADR does NOT introduce a full validation framework — Zod schemas in action files are sufficient; cross-cutting validation concerns are a future decision.

## Related Notes
- Supersedes the implicit "throw errors or return null/false" pattern from ADR-005.
- Complements ADR-017 (TanStack Query mutations use `mutationFn` that can handle `ActionResponse`).
- References ADR-016 for the docTR routing change that is also included in this batch.
- Verification script: `frontend/scripts/verify-adr-018.sh` (`npm run verify:adr-018`).
