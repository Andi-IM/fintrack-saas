# ADR-061: Secure Low-Latency Dashboard Rendering

## Status

Accepted

## Context

Vercel Speed Insights reported poor First Contentful Paint for the authenticated dashboard route. Request logs showed the server path was the dominant cost: middleware authentication took about 1.69 seconds, the `/` function took about 1.61 seconds, and the response finished around 3 seconds before the browser could paint.

The existing security model must remain intact: authenticated users are required, `AUTHORIZED_EMAIL` is enforced, and Supabase Row Level Security protects user-scoped financial data.

## Decision

Use Supabase `auth.getClaims()` as the fast middleware path for validating JWT identity and enforcing `AUTHORIZED_EMAIL`, while retaining `auth.getUser()` as the fallback when claims cannot be validated locally.

Create a narrow dashboard read model as a Postgres view with `security_invoker = true`, so dashboard queries avoid `select('*')` and `count: exact` while still evaluating the underlying `cash_flow` RLS policies as the authenticated caller.

## Alternatives Considered

- **Remove middleware authentication from the dashboard**: Rejected because it would weaken route protection and rely too heavily on downstream failures.
- **Use `service_role` from the server for dashboard reads**: Rejected because it bypasses RLS and violates the production security model.
- **Use `getSession()` for server-side authorization**: Rejected because session data is not a trusted authorization source in server code.
- **Materialized dashboard view**: Deferred because it introduces refresh and stale-data concerns. A narrow `security_invoker` view is a lower-risk first step.

## Consequences

The common middleware path avoids an Auth network call when JWT claims can be verified from cached JWKS, reducing time to first byte without making the dashboard public. The dashboard data path transfers fewer columns and avoids exact count work.

The fallback to `getUser()` preserves secure behavior for expired, missing, or locally unverifiable claims. If the Supabase project uses symmetric JWT signing, `getClaims()` can still require an Auth call, so the performance gain depends on the production JWT signing configuration.

## Related Notes

- `frontend/lib/supabase/middleware.ts`
- `frontend/lib/repositories/cash_flow.ts`
- `supabase/migrations/20260723000000_create_dashboard_cash_flow_view.sql`
