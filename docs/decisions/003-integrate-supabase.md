# ADR-003: Supabase Integration as Primary Database Backend

## Status
Accepted

## Supersedes
None

## Context
The FinanceTracker application currently relies on a `mockSupabaseQuery` mock representation that stores transactional data in in-memory state. To make it persistent, secure, and ready for production / multi-user flow, an actual cloud database integration is required. Supabase is recommended because of its ability to provide a Postgres endpoint via REST using an API key, as well as an easy setup for serverless/edge or web client environments.

## Decision
Integrate the project with **Supabase**. We use the `@supabase/supabase-js` module, set up the `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` environment variables, and replace the mock service layer in the application with a Supabase API client that points directly to Supabase's PostgreSQL row-level access public API.

This connectivity also opens up the possibility for users to remotely define the `transactions` table containing ID, type, amount, category, date, and other metadata such as note and paymentMethod.

## Alternatives Considered
- **Cloud SQL**: Requires more complex connection setup, raw query building/ORM configuration like Prisma/Drizzle.
- **Firebase Firestore**: Because transaction data is more tabularly structured (organized schema), using a relational database like PostgreSQL in Supabase is recommended over Firebase's NoSQL document.

## Consequences
- **Positive**: Transactional data is now persistently stored.
- **Positive**: The app architecture is ready to proceed to Row-Level Security (RLS) implementation and Supabase Auth user authentication if needed later.
- **Trade-off**: The application must delay loading on startup because asynchronous fetch requests depend on network capabilities. Platform users / developers must provide *credentials* in the *secrets* UI.

## Related Notes
- See initialization at `lib/supabase.ts` and the new environment variable guide at `.env.example`. Modifying the database repository references in `components/FinanceTracker.tsx`.
