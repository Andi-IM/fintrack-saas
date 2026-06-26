# ADR-051: Decouple Login Page UI from Supabase Client Initialization

## Status
Accepted

## Context

The `app/login/page.tsx` component previously imported `checkIsLocalSupabase()` from `@/lib/supabase`. This function was a utility to determine whether the app is running against a local Supabase instance, and conditionally render either an email/password login form (for local dev) or a GitHub OAuth button (for production).

The problem is that `@/lib/supabase` initializes a Supabase client at **module level**:

```ts
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
```

During Vercel **deploy previews**, environment variables like `NEXT_PUBLIC_SUPABASE_URL` may not be present (or not yet injected), causing the page to crash at module evaluation time with an error like:
> `supabaseUrl is required`

This violates the principle that the login page—a **pure UI/interface component**—should have zero dependency on infrastructure initialization.

Similarly, reading `NEXT_PUBLIC_SUPABASE_URL` inline to perform string-based checks (`includes('localhost')`) also risks crashing on Vercel preview when the variable is absent, since `undefined.includes(...)` throws.

## Decision

Remove all references to Supabase-related imports and environment variables from `app/login/page.tsx`. Instead, determine the rendering mode using only environment variables that are guaranteed to be available (or absent) across all environments without side effects:

```tsx
// In app/login/page.tsx
const isLocalSupabase = process.env.NODE_ENV === 'development' || !process.env.VERCEL
```

**Rationale:**
- `process.env.NODE_ENV === 'development'` — Always set by Next.js locally, never `'development'` on Vercel.
- `!process.env.VERCEL` — Vercel automatically injects `VERCEL=1` in **all** their environments (production, preview, development). When the app runs locally, this variable is absent (`undefined`), making the negation `true`.

This means:
- **Local dev** → shows email/password login form.
- **Vercel preview or production** → shows GitHub OAuth button, with no crash.

## Alternatives Considered

1. **Keep `checkIsLocalSupabase()` but lazily import `@/lib/supabase`** — Dynamic imports for server components add complexity and don't solve the root cause (module-level `createClient` still runs on import).

2. **Check `NEXT_PUBLIC_SUPABASE_URL` inline with a guard** — Prone to undefined crashes in Vercel Preview; also conceptually wrong (the UI page shouldn't need to know about the Supabase URL to decide which button to render).

3. **Move `createClient` inside functions to avoid module-level execution** — Would require refactoring `@/lib/supabase.ts` and all consumers. Correct long-term but out of scope for this fix.

## Consequences

**Positive:**
- Login page becomes a true **interface/UI component** with no infrastructure coupling.
- Deploy previews on Vercel no longer crash due to missing Supabase environment variables.
- Detection logic is simpler, more reliable, and easier to understand.
- Unit tests for the login page no longer require mocking Supabase client setup.

**Trade-offs / Risks:**
- The feature flag (local vs. production login form) now relies on `NODE_ENV` and `VERCEL`, not Supabase URL. This means if someone runs the app locally with a real production Supabase URL (but without `VERCEL=1`), they will still see the email/password form. This is acceptable for this project's use case.

## Related Notes

- `@/lib/supabase.ts` — The module with the global `createClient` call that was the root cause.
- `ADR-049` — Local email/password authentication implementation.
- `ADR-034` — Auth data-layer decoupling pattern.
- `app/login/page.tsx` — The component that was modified.
