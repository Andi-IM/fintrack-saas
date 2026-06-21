# Testing & Code Coverage Documentation

This document outlines the testing strategy, standards, and code coverage metrics for the FinTrack SaaS platform.

## Codecov Status & Graphs

### Project Coverage Badge
[![codecov](https://codecov.io/gh/Andi-IM/fintrack-saas/graph/badge.svg?token=KyUSihKYsJ)](https://codecov.io/gh/Andi-IM/fintrack-saas)

### Coverage Sunburst / Tree Graph
Below is the live coverage tree map for the codebase:

![Codecov Coverage Graph](https://codecov.io/gh/Andi-IM/fintrack-saas/graphs/tree.svg?token=KyUSihKYsJ)

---

## Development Branch Workflow

To maintain code quality and ensure features are thoroughly tested before release, we enforce a strict branch-based development workflow:

```mermaid
graph TD
    A[Feature/Bugfix Branch] -->|Create PR| B[dev Branch]
    B -->|CI/CD validation: Test & Build| C{Tests Passed?}
    C -->|Yes| D[Merge into dev]
    C -->|No| E[Fix Tests]
    E --> B
    D -->|Promote / Merge dev| F[main Branch]
    F -->|Production Deploy| G[Live App]
```

1. **Development (`dev`):** All feature development and bug fixes must target the `dev` branch. Pull requests must be opened from working branches to `dev`.
2. **Main / Production (`main`):** Once features are stabilized in `dev`, a pull request is raised from `dev` to `main`. This is our production-ready branch.
3. **CI/CD Triggers:** Automated test workflows (including Vitest tests, coverage upload, and Codecov Bundle Analysis) run on every push and pull request targeting both `dev` and `main` branches.

---

## Testing Framework & Architecture

For frontend validation, we use **Vitest** combined with **React Testing Library (RTL)**.

### Architectural Decisions (ADR)
For details on the testing setup, configuration, and coverage thresholds, see [ADR-030: Adopt Vitest and React Testing Library for Frontend Testing](decisions/030-adopt-vitest-and-react-testing-library-for-frontend-testing.md).

### Coverage Threshold Guidelines
- **Global Thresholds:** Initially set to `10%` statements and `9%` functions to accommodate initial setup and roll out incremental test cases without blocking the build pipelines.
- **Goal:** Gradually increase global coverage thresholds to `80%+` as the project matures.

---

## Mocking Strategies for Frontend Repository Pattern

Following the integration of the Frontend Repository Pattern (see [ADR-047](decisions/047-standardize-frontend-testing-repository-pattern.md)), our testing environment relies on strict separation of concerns. Adhere to the following rules when writing tests:

1. **Mocking Server Actions (UI Tests)**
   When testing UI components, **do not** mock the repository directly. Instead, mock the Server Action that the component calls.
   ```typescript
   vi.mock('@/features/cash-flow/actions/cash_flow', () => ({
     deleteCashFlow: vi.fn().mockResolvedValue({ success: true })
   }))
   ```

2. **Mocking Repositories (Server Action Tests)**
   When testing Server Actions themselves, use Dependency Injection to inject Fake Repositories instead of mocking Supabase.
   ```typescript
   import { setCashFlowRepository } from '@/lib/repositories/cash_flow'
   import { FakeCashFlowRepository } from '@/lib/repositories/fake-cash-flow'
   
   beforeEach(() => {
     setCashFlowRepository(new FakeCashFlowRepository())
   })
   ```

3. **Required Context Providers**
   Ensure components that rely on `nuqs` or `@tanstack/react-query` are wrapped or mocked correctly. For global `nuqs` state, explicitly mock it and reset it in `beforeEach` to prevent state leakage.

