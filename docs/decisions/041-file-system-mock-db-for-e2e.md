# ADR-041: File-System Persistence for E2E Fake Repositories

## Status
Accepted

## Context
During E2E testing with WebdriverIO and Next.js App Router, we previously relied on stateless mocks or in-memory singletons (`FakeCashFlowRepository`, etc.) to intercept database calls. However, this approach presented critical limitations:
1. **State Loss Across Requests**: Next.js App Router utilizes separate processes and Serverless/Edge function architectures (even locally, Next.js can isolate API requests from Server Components). An in-memory array modified in a Server Action would instantly revert to its initial state when a subsequent data fetch occurred during a page redirect or component hydration.
2. **E2E Synchronization**: WebdriverIO tests act as external black-box clients. To assert complex user flows like deleting an item, the "Fake DB" needs to reliably persist the deleted state across multiple HTTP requests and page navigations, which memory arrays failed to do.

## Decision
To establish a robust local database mocking infrastructure for E2E, we decided to:
1. **Implement a File-System Mock Database (`fs-mock-db.ts`)**: Abstract the in-memory array storage into a local JSON file store (e.g., `.mock-db.json`). This ensures that changes made by Next.js Server Actions or API routes are safely persisted to disk and instantly accessible by subsequent reads, mimicking true database persistence without spinning up a real PostgreSQL instance.
2. **Implement an E2E Reset API (`api/e2e/reset`)**: Create a backdoor API route explicitly designated for E2E resets. WebdriverIO scripts invoke this endpoint (`POST /api/e2e/reset`) before every test suite starts, which commands the Next.js backend to delete the local JSON file and reseed it to a pristine state.

## Alternatives Considered
- **Spinning up a local Postgres Container in CI**: Rejected because it drastically increases the CI pipeline time, necessitates complex database migrations before testing, and slows down local developer feedback loops compared to a lightweight File-System JSON Mock.
- **SQLite In-Memory DB**: Similar isolation issues arise across Next.js worker threads unless written to a physical SQLite file, which involves setting up Prisma/Drizzle schemas specifically for the mock DB—adding unnecessary overhead.

## Consequences
- **Positive**: Complete persistence across E2E tests, allowing WebdriverIO to test multi-step forms, updates, and deletes with 100% deterministic results.
- **Negative**: The `fs-mock-db.ts` and fake repositories must be strictly isolated from production code to ensure mock logic (and file I/O operations) never leak into the deployed SaaS application.

## Implementation Plan
- **Affected paths**: 
  - `frontend/lib/repositories/fs-mock-db.ts`
  - `frontend/lib/repositories/fake-*.ts`
  - `frontend/app/api/e2e/reset/route.ts`
- **Pattern**: 
  - All fake repositories extend or utilize `FsMockDb` for their internal CRUD operations.
  - The E2E script `before()` hook calls `fetch('http://localhost:3000/api/e2e/reset', { method: 'POST' })`.

## Verification
- [x] Data mutated in a Server Action is correctly reflected when the page re-fetches data.
- [x] E2E runs are deterministic and isolated; data from test suite A does not bleed into test suite B.

