# ADR-049: Local Email & Password Authentication Support

## Status

Accepted

## Context

In local development environments (e.g., using Supabase CLI at `http://localhost:8000`), configuring and testing OAuth providers like GitHub can be complex and depends on external setups, API credentials, and internet availability. 

Currently, the application relies on GitHub OAuth for authentication, making it difficult to test auth flows and protected routes locally without complex setup. A simpler, self-contained email and password authentication mechanism is needed specifically for local Supabase environments.

## Decision

We will:
1. Extend the `AuthService` interface with `loginWithPassword` and `signUpWithPassword` methods.
2. Implement these methods in `SupabaseAuthService` using Supabase's `signInWithPassword` and `signUp` methods.
3. Implement these methods in `FakeAuthService` to preserve testing capability and support mock session handling.
4. Add new Next.js Server Actions `loginWithCredentials` and `signUpWithCredentials` that follow ADR-018 (ActionResponse union) and ADR-043 (redirect error propagation).
5. Build a premium glassmorphic credentials UI (`LoginForm`) and conditionally render it on the `/login` page if the backend Supabase URL is detected as a local server (e.g., matching `localhost` or `127.0.0.1`).
6. Enforce that only the `AUTHORIZED_EMAIL` is allowed to log in or sign up to prevent unauthorized registrations in local setups, matching the existing middleware's restrictions.

## Alternatives Considered

- **Use GitHub OAuth in Local (No Change)**: Rejected because it requires everyone setting up the dev environment to register a GitHub OAuth app and exposes the environment to configuration drift.
- **Always Enable Email/Password Auth**: Rejected because production authentication is restricted to GitHub OAuth (ADR-006) for simplicity and security. We should restrict credentials auth to local Supabase instances.

## Consequences

### Positive
- **Better Developer Experience**: Developers can start working with Supabase Auth immediately without configuring external OAuth providers.
- **Production Safety**: Credentials-based UI is conditionally rendered only on local Supabase URLs, preserving production GitHub OAuth.
- **Robust Error Handling**: Server actions return standard `ActionResponse` objects for inline validation feedback while correctly re-throwing redirects.

### Risks & Trade-offs
- Email verification is bypass-dependent in the local Supabase config (`confirm_signup: false`). If it's enabled locally, the user must look at the local SMTP logs to confirm signup. However, we validate the email immediately against `AUTHORIZED_EMAIL` to prevent user registration mistakes.
