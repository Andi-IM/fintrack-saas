# ADR-006: GitHub OAuth Integration and Email Whitelist Restriction

## Status
Accepted

## Context
The application previously used a passwordless email OTP (Magic Link) and password-based login mechanism. However, email-based authentication flows presented several issues:
1. Free-tier Supabase projects impose a strict rate limit on email sending (3 emails per hour), leading to `over_email_send_rate_limit` (429) errors during active development.
2. Email scanners and anti-virus proxies pre-fetch links, consuming the single-use token and invalidating the link before the developer can click it.
3. Access control was hardcoded, making it difficult to restrict the application to only a single authorized user (`authorized@example.com`) securely without redeploying code.

## Decision
1. **GitHub OAuth**: Migrate the authentication provider to GitHub OAuth utilizing Supabase's `signInWithOAuth` method.
2. **Authorized Email Environment Variable**: Create an `AUTHORIZED_EMAIL` environment variable inside `.env` to hold the allowed email address.
3. **Server-Side Enforcement**: 
   - **Auth Callback (`app/auth/callback/route.ts`)**: Immediately after exchanging the authorization code for a session, check if `user.email` matches the `AUTHORIZED_EMAIL` variable. If not, invoke `supabase.auth.signOut()` and redirect to `/login` with a `message=Unauthorized user email`.
   - **Middleware Guard (`lib/supabase/middleware.ts`)**: Apply a second-layer check on all protected routes. If an authenticated user's email does not match `AUTHORIZED_EMAIL`, sign them out and redirect them to `/login`.

## Alternatives Considered
* **Retaining OTP / Magic Link**: Rejected due to high rate-limiting friction and flakiness with email client links.
* **Email/Password Login**: Rejected because it requires users to sign up and manage passwords, whereas GitHub OAuth provides a seamless one-click experience.

## Consequences
* **Positive**:
  - Secure, fast, one-click authentication.
  - Developer is no longer blocked by email send rate limits.
  - Strong access control that can be configured dynamically without code changes (by modifying the `.env` file).
* **Negatives/Risks**:
  - Requires active configuration of OAuth Client ID and Secret in the Supabase Dashboard and GitHub developer settings.
  - Offline local testing is dependent on GitHub OAuth server availability.
