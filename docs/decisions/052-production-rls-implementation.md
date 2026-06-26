# ADR-052: Production-Ready Row Level Security (RLS) Implementation

## Status

Accepted

## Context

Since the initial Supabase integration (ADR-003), all tables in `public` schema have had RLS **enabled** but all policies use `USING (true)` — meaning any client with the `anon` key can read and write **all rows across all users**. This was intentional for the prototype phase.

The application now has:
- Auth via GitHub OAuth (ADR-006) and local email/password (ADR-049), with a single `AUTHORIZED_EMAIL` enforced at middleware level
- Persistent data in production: `cash_flow`, `bank_statements`, `bank_statement_items`, `receipts`, `receipts_items`
- A Supabase Storage bucket `receipts` with public access and no user isolation
- A `SECURITY DEFINER` trigger function (`sync_bank_statement_item_to_cash_flow`) living in the `public` schema, which exposes it as a callable RPC endpoint via PostgREST

These gaps must be closed before the application can be considered production-secure.

## Decision

We implement user-scoped Row Level Security across all tables and Supabase Storage via 6 sequential migration files:

### 1. Add `user_id` to Root Tables
Add a `user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE` column to `cash_flow`, `bank_statements`, and `receipts`. Child tables (`bank_statement_items`, `receipts_items`) inherit ownership through their parent FK — no `user_id` column needed on them.

### 2. Enforce User-Scoped Policies
Replace all `USING (true)` policies with:
- **Root tables**: `USING (auth.uid() = user_id)`
- **Child tables**: `USING (EXISTS (SELECT 1 FROM parent WHERE parent.id = child.parent_id AND parent.user_id = auth.uid()))`

`UPDATE` policies always include both `USING` (which rows can be targeted) and `WITH CHECK` (what values are allowed after update) to prevent privilege escalation.

### 3. Auto-fill `user_id` via BEFORE INSERT Trigger
A `private.set_user_id()` trigger function automatically sets `user_id = auth.uid()` on every insert, so application code does not need to pass `user_id` explicitly. The function is placed in the `private` schema (not `public`) to prevent PostgREST from exposing it as an RPC endpoint.

### 4. Backfill Existing Data
Since the database has production data without `user_id`, a DO block selects the single user from `auth.users` (this is a single-user app) and updates all orphaned rows. After backfill, `user_id NOT NULL` is enforced.

### 5. Secure Storage Bucket
The `receipts` bucket is changed from `public = true` to `public = false`. Storage object policies are replaced with user-scoped policies that check `(storage.foldername(name))[1] = auth.uid()::text`, enforcing the path convention `receipts/<user_id>/<filename>`. Files are accessible only via **signed URLs** generated server-side.

> **Frontend follow-up required**: The upload path in the receipts upload logic must be updated from `receipts/<filename>` to `receipts/<user_id>/<filename>`, and file display must use `createSignedUrl()` instead of public URLs.

### 6. Move `SECURITY DEFINER` Function to `private` Schema
The trigger function `sync_bank_statement_item_to_cash_flow` is recreated in the `private` schema and the old `public` version is dropped. All three triggers (INSERT, UPDATE, DELETE) are updated to point to `private.sync_bank_statement_item_to_cash_flow()`.

## Alternatives Considered

- **Service Role Key in Backend**: Using the `service_role` key from the backend bypasses RLS entirely. Rejected: this would require all DB access to go through a custom API layer, adding significant complexity. RLS at the DB layer is simpler and more defense-in-depth.
- **Single `FOR ALL` Policy on All Tables**: Using `FOR ALL` with `USING(true) WITH CHECK(auth.uid() = user_id)` allows reads on all rows but restricts writes. Rejected: reads must also be user-scoped for data privacy.
- **Keep `SECURITY DEFINER` in Public Schema with Revoke**: Revoking `EXECUTE` on the function from `anon`/`authenticated` roles could also prevent direct RPC calls. Rejected: moving to `private` schema is cleaner, more idiomatic, and does not require remembering to revoke on every new function.

## Consequences

### Positive
- **Data Isolation**: Users can only access their own rows — enforced at the database layer, not just middleware.
- **Defense in Depth**: Even if middleware auth is bypassed, RLS at Postgres level prevents cross-user data leakage.
- **Storage Privacy**: Receipt images are no longer publicly accessible by URL guessing; signed URLs expire and are user-scoped.
- **Reduced Attack Surface**: `SECURITY DEFINER` functions removed from the PostgREST-exposed `public` schema.
- **Automatic `user_id` Fill**: Application code does not need to be changed to pass `user_id` — the trigger handles it transparently.

### Risks & Trade-offs
- **Frontend Storage Follow-up**: The upload path and file display logic for receipts must be updated in a follow-up task to use `receipts/<user_id>/<filename>` paths and signed URLs.
- **Existing Storage Files**: Files already uploaded to the bucket without a `user_id` prefix will be inaccessible after this migration. They must be manually moved in the Supabase Storage dashboard or via a script.
- **`bank_statement_items` Policy Performance**: The child-table policy uses a correlated `EXISTS` subquery. An index on `bank_statements(user_id)` (added in Migration 1) mitigates this.

## Related Notes

- Migration files: `supabase/migrations/20260627000001` through `20260627000006`
- Supersedes partial security intent in: ADR-003, ADR-006
- Storage signed URL usage: see [Supabase Storage docs](https://supabase.com/docs/guides/storage/serving/signed-urls)
- Follow-up: Frontend receipt upload path and display must be updated (separate ADR/task)
