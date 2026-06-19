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
For details on the testing setup, configuration, and coverage thresholds, see [ADR-030: Adopt Vitest and React Testing Library for Frontend Testing](file:///D:/01_Projects/fintrack-saas/docs/decisions/030-adopt-vitest-and-react-testing-library-for-frontend-testing.md).

### Coverage Threshold Guidelines
- **Global Thresholds:** Initially set to `10%` statements and `9%` functions to accommodate initial setup and roll out incremental test cases without blocking the build pipelines.
- **Goal:** Gradually increase global coverage thresholds to `80%+` as the project matures.
