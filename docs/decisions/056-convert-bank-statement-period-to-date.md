# ADR-056: Convert Bank Statement Period to Date

## Status
Accepted

## Context
`bank_statements.statement_period` previously stored display labels such as `JUN 2026`, `MEI 2026`, and `DES 2025` as free-form text. This made chronological sorting and validation depend on application-side parsing and allowed invalid period labels to reach the persistence boundary.

The UI still needs to show a month-year label, for example `JUL 2026`, because users think of bank statements by statement month rather than by a full day-level date.

## Decision
Convert `public.bank_statements.statement_period` from `text` to PostgreSQL `date`, storing the first day of the represented month in `YYYY-MM-01` format.

Application code normalizes OCR or manually edited month-year values before saving. Existing UI surfaces format the stored date back to an uppercase month-year label such as `JUL 2026`.

## Alternatives Considered
- Keep `statement_period` as text and improve parsing. Rejected because it preserves invalid free-form storage and keeps sorting dependent on application logic.
- Store separate `statement_year` and `statement_month` integer columns. Rejected because a single `date` column is simpler, idiomatic in Postgres, and still sortable/filterable.
- Store the last day of the month. Rejected because the first day is easier to construct deterministically and avoids month-length/leap-year concerns.

## Consequences
- Positive: Statement periods are sortable and filterable with native date semantics.
- Positive: Existing UI can continue showing concise month-year labels.
- Positive: Inserts reject unparseable period labels before reaching Supabase.
- Trade-off: Multi-month OCR labels are collapsed to their ending month when persisted as a single date.
- Risk: External code that expects the raw text label must format the date before display.

## Related Notes
- Migration: `supabase/migrations/20260721150128_convert_statement_period_to_date.sql`
- Frontend formatter: `frontend/lib/utils/statement-period.ts`
- Statement actions: `frontend/features/bank-statements/actions/statements.ts`
