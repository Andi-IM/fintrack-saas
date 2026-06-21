# ADR-042: Fake Authentication Strategy for Local E2E Testing

## Status
Accepted

## Context
Our SaaS platform leverages Supabase Auth for user authentication and session management. When running E2E tests, connecting to a real Supabase instance introduces several critical pain points:
1. **Network Dependency & Latency**: Tests take longer because every login/logout and session check action requires an HTTP call to Supabase cloud servers.
2. **Rate Limiting**: Running parallel tests or frequent CI pipelines triggers Supabase rate limits on login endpoints.
3. **Flakiness**: Real auth endpoints can sometimes be slow or temporarily unavailable, causing false-negative test failures.
4. **Setup Complexity**: Requires seeding test users on the cloud instance and managing environment variables securely in CI.

## Decision
To decouple our E2E testing from Supabase Auth, we decided to:
1. **Abstract Authentication Logic**: Create an interface or unified entry point (`lib/auth/index.ts`) to fetch the current user and manage sessions instead of calling `@supabase/ssr` directly inside every component.
2. **Implement Fake Authentication (`fake-auth.ts`)**: When the `NEXT_PUBLIC_IS_TESTING=true` environment variable is detected, the auth wrapper routes all requests to a local `FakeAuth` class. 
3. **Cookie-Based Testing State**: `FakeAuth` simply checks for the presence of a hardcoded mock cookie (e.g., `mock_user_session=true`) to grant authorization and bypass middleware protections. E2E scripts only need to set this cookie via WebdriverIO (`browser.setCookies()`) to instantly "log in" a test user.

## Alternatives Considered
- **Supabase Local Emulator**: Running the Supabase Docker CLI locally. Rejected because spinning up the entire Supabase Docker stack just for E2E testing in CI adds tremendous overhead (CPU, RAM, pipeline time) when all we need is a simple boolean authorization check.
- **Mocking at the Network Layer (MSW)**: Rejected because intercepting Next.js Server Components HTTP requests in a production build using MSW is complex and brittle compared to a clean Dependency Injection pattern.

## Consequences
- **Positive**: Blazing fast, 100% offline, and deterministic E2E auth flows. Test scripts can log in users in 0ms simply by injecting a cookie.
- **Negative**: The `fake-auth.ts` implementation must be maintained. Furthermore, we are not testing the *actual* Supabase integration in E2E. If the Supabase SDK upgrades and breaks, E2E won't catch it; we must rely on dedicated Integration Tests or Manual QA for core Auth logic.

## Implementation Plan
- **Affected paths**: 
  - `frontend/lib/auth/fake-auth.ts`
  - `frontend/lib/auth/supabase-auth.ts`
  - `frontend/lib/auth/index.ts`
- **Pattern**: 
  - All application code calls `getCurrentUser()` from `lib/auth/index.ts`.
  - `index.ts` uses conditional logic (`process.env.NEXT_PUBLIC_IS_TESTING`) to return either the Fake Auth user or the real Supabase user.

## Verification
- [x] E2E test `Auth` suite successfully logs in and out using mock cookies.
- [x] Production builds run successfully with the real Supabase client active.

